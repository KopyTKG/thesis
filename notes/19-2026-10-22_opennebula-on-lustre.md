# 19 - 2026-10-22: OpenNebula on the Lustre pool (hosts, datastore, networking, failure tests)

Sources: `UJEP-LAB/opennebula/playbooks/stage11_restore_stack.yml` to `stage16_vrouter.yml` (commit `b083b78` and earlier), owner decisions given in session.

## Design (owner decisions)

- All 10 nodes are KVM hypervisors. The two heads are limited: `RESERVED_CPU="50%"`, `RESERVED_MEM` 24 GiB, `SCHED_WEIGHT=0` (computes 1), `SCHED_RANK = "SCHED_WEIGHT * 1000 - RUNNING_VMS"`. LXC hosts not chosen yet.
- Networks: eno1 public (clients/students reach VMs), eno2 WAN, all cluster traffic over IB. Physical NICs untouched until the public address range is known.
- Datastore: Lustre FLR (two mirrors, `pool_a` = OST0-7, `pool_b` = OST8-f) with a periodic resync, bind-mounted to `/var/lib/one/datastores`. Datastores 100 (system, shared) and 101 (images, fs/shared).

## Results

- Stack restored from a Galera cold start (stage 11); 10 hosts registered (heads 38.3 GiB / computes 62.3 GiB usable).
- VM boot from the Lustre datastore works. **Live migration works: 5.8 s, 3 of 3**, after `MIGRATE_OPTIONS=--unsafe` (libvirt refuses live migration on a non-"safe" shared filesystem). The option must sit on its own line in `kvmrc`: an inline comment made the driver's Ruby parser skip the line silently.
- Guest I/O on the datastore: sequential write 92.8 MB/s, read 487 MB/s, buffered 4k 72 MB/s. **500 synced 4 KiB overwrites took 53.5 s (about 107 ms each, about 9 per second)**, so synchronous small writes inside a VM are slow on this pool.
- Networking: VXLAN network `priv_net1` over IB (`PHYDEV ibs1`, VNI 100). Host-to-host worked at once; VM-to-VM across hosts did not until firewalld got a dedicated zone `one-vm` for `onebr.+`/`br-+` (`br_netfilter` is loaded for security groups, so bridged traffic hits the FORWARD chain). After that 0.54-0.67 ms between VMs on different hosts.
- Virtual router (marketplace "Service Virtual Router", app 113): NAT proven, a packet capture on the uplink bridge showed a VM at 10.10.1.10 arriving as 172.31.0.12 (the router's uplink address). Single instance gets no floating gateway; the guests' default route had to be pointed at the router's own IP. Template needed the onegate `TOKEN` and `USER_INPUTS` removed (no onegate endpoint; interactive prompts hang non-interactive instantiation). The uplink is a per-host bridge (`test_isolated`), so the router and the "outside" VM had to be on the same host.

## Findings

1. **FLR mirrors of running VM disks never get in sync.** `lfs mirror resync` needs a write lease and fails with `Device or resource busy` while qemu holds the file open. The 5-minute `one-ds-resync` timer therefore failed on all 5 VM disks in use (`resynced 0 of 5`). The second mirror is stale for as long as the VM runs, so the datastore's redundancy only protects disks of stopped VMs. A redundancy scheme for running VMs needs another mechanism (for example periodic snapshot/copy of a closed file, or storage-level redundancy).
2. Scheduler placed two VMs on one node when ranking by monitored free CPU; fixed with the `SCHED_RANK` above.
3. `lfs df` listed every OST twice after the datastore bind mount; the health check now names `/mnt/lustre` explicitly.

## Host-failure recovery (2026-10-29): proven, after five defects were found and fixed

Test: hard power-off (`echo o > /proc/sysrq-trigger`) of a compute that runs a VM, nothing done by hand afterwards. Final run: Compute-8 (VM t2) cut at 15:33:45; OpenNebula flags the host in error at 15:36:58 (3 min 13 s, two 180 s monitoring cycles); the `host_error` hook fences the host over IPMI and recreates the VM at 15:39:00; the unstick timer clears the cleanup; **t2 runs on Compute-4 at 15:39:17, guest agent answering: 5 min 32 s from power cut to a running VM, no manual step.** Earlier runs: Compute-8 (t2) 14 min with manual steps, Compute-7 (v1 + t2) recovered with manual steps, Compute-4 (t1 + virtual router) recovered unattended up to a Lustre stall (defect 5).

| # | Defect found | Cause | Fix (stage) |
|---|---|---|---|
| 1 | The hook never ran on its own | `opennebula-hem` starts at boot while oned is still down, loads zero hooks (`Cannot get hook information`) and never reloads | restart `opennebula-hem` after oned answers (11) |
| 2 | Hook crashed with `undefined method unpack1 for nil` (RC 1) | `ft/host_error.rb` reads its arguments from stdin; the hook definition lacked `ARGUMENTS_STDIN="yes"` | definition fixed (17) |
| 3 | Hook could not fence | stock `ft/fence_host.sh` is a stub that exits 1 | IPMI power-off script, credentials from the vault in a 0600 oneadmin file, `FENCE_IP` on every host (17) |
| 4 | VM stuck in CLEANUP_RESUBMIT for ever | cleanup runs `cancel` over ssh on the dead host | `one-ft-unstick.timer` (30 s) marks the step done, only for VMs on a host in ERROR that has a `FENCE_IP` (17) |
| 5 | New VMs hang in PROLOG/BOOT after a node loss | the MDS keeps allocating new objects on the dead OSS's OSTs, so the `cp` into `datastores/.isofiles` stalls | dead-OST watchdog on both heads (18) |

Dead-OST watchdog (`lustre-ost-watchdog`, 10 s timer on both MDS): an OSS is dead when an OST import is not FULL and `lctl ping` fails for 35 s; its OSTs get `osp.<dev>.active=0` on each MDT, and `active=1` again after two successful pings. Cap: more than two dead OSS at once, do nothing. Measured: node cut, OSTs deactivated 68 s later; with the node still down **40 x 1 MiB file creates took 0.17 s and none landed on the dead OSTs** (objects spread over the other 14); node powered on 15:30:53, OSTs reactivated 15:33:07 (2 min 14 s). Scope: MDS side (new objects) only; clients keep reading the dead OST until the FLR mirror takes over, and mirrors of running VM disks are stale (finding 1), so a VM whose disk primary sits on the lost node still stalls.

### Cold start and shutdown (2026-10-29), measured

`just down` and `just up` were reworked and run three times. Each run found a defect that the previous runs could not show:

| Run | Defect found | Cause | Fix |
|---|---|---|---|
| start 1 (after the ordering fix) | `just up` failed at oned: "Lost connection to MySQL server at 'reading initial communication packet'" | HAProxy (DB VIP) accepts the connection but has no healthy Galera backend for a few seconds after the join | wait with `mysqladmin -h <VIP> ping`, `reset-failed` (11) |
| start 1 | clients saw 4 of 16 OSTs for minutes after Lustre was "mounted"; VMs resumed too early failed back to POWEROFF | OSTs are in recovery until clients reconnect (`ost_connect rc = -16` on every console) | `just up` waits until every node sees 16 OSTs before it restores oned and resumes the VMs (wait_cluster) |
| start 1 | `/var/lib/one/datastores` empty on all 8 computes, every deploy "Cannot access storage file disk.0" | the bind-mount unit had `Requires=lustre-startup`; the first lustre-startup attempt failed on the computes (servers not ready), so the mount job failed for good ("Dependency failed") and a mount unit cannot retry | retrying `one-datastore-bind.service` (`Wants`, `Restart=on-failure`) replaces the mount unit (19) |
| shutdown 1 and 2 | 3 of 10 nodes (Compute-3, Compute-7, Head-1; Head-1 alone in run 2) still powered after more than 6 minutes, had to be cut over IPMI | no persistent journal at first, so no log; after enabling it (`/var/log/journal`) the journal of the hung Head-1 showed MDT, MGS and MariaDB unmounted at 16:04:22.3, `Unmounting /var/lib/one/datastores...` logged and never `Unmounted`. A lazy `umount -l /mnt/lustre` leaves the bind mount holding the Lustre client, systemd then unmounts it after the servers are gone | the shutdown play stops oned/libvirt, unmounts the bind mount and `/mnt/lustre` for real (lazy only as a fallback) while the servers still answer |

| start 3 | `just up` finished but no VM was running; they sat in SHUTDOWN_POWEROFF | the drain waited only until no VM was `runn`; libvirt was stopped (by the new unmount step) while the guests were still shutting down, so they never reached POWEROFF and the resume (POWEROFF only) skipped them | the drain waits for POWEROFF (ACPI first, `--hard` for stragglers) |

Timings: `just down` with the VMs powered off first: 48 s for the play, all nodes off in about 75 s when nothing hangs; after the umount fix **all 10 nodes off 1 min 57 s after the command, no node cut by hand**. `just up` from fully off: power-on, Lustre mounted on all nodes in about 4 minutes (Head-1 takes about 3 min 20 s in its BIOS/network-boot ROMs before the disk boots: BIOS boot order, not a fault), all 16 OSTs visible from every node at about 9 min, Galera bootstrap, oned, hooks, agents and VMs back: **10 min, 0 failed tasks, no manual step** (run 2, 16:06:03 to 16:16:04); end state checked: Galera 3, 10 hosts on, 5 VMs running, 16 OSTs active, bind mount on all 10 nodes.

Persistent journals were switched on for all nodes (`/var/log/journal`) because the first two shutdown hangs left no trace.

Earlier on the same day the stage 13 bind-mount unit lacked `DefaultDependencies=no`, so systemd found an ordering cycle through `local-fs.target`, `lustre-startup` and `network-online.target` and deleted jobs, among them `systemd-tmpfiles-setup` (no `/run/mariadb`, MariaDB would not start) and the network ordering of `lustre-startup` (no o2ib on the heads, MDT0 would not mount; Compute-5 panicked twice in a Lustre target mount at boot). That unit has since been replaced by the retrying service above.

Other observations: `onehost sync --force` was needed once after the oned restart before hosts reported monitoring; Galera has to be bootstrapped by hand (stage 11) after a full shutdown; the shutdown powers the VMs off first and `just up` resumes the ones in POWEROFF (a VM the owner powered off on purpose is resumed too).

### Hardware: Compute-5 OS disk

During the tests the SanDisk X600 (sda, OS disk) of Compute-5 dropped off the SATA link ("rejecting I/O to offline device", XFS shut down on the root volumes, sshd resetting connections, OSTs on the Samsung drives kept serving). SMART passed before and after (0 reallocated, 0 CRC), 10 link resets in the counters; it came back after the owner reseated it. Timing: about 25 s after SMART short self-tests were started on all three drives, so a trigger by the test cannot be excluded. Same pattern as Compute-3, Compute-7 and sdb of Compute-5 (6 CRC errors): connector/cable/backplane, not media. Treat as unreliable until the cable is replaced.

## Open

- Storage-node loss with a VM whose disk primary is on the lost node (watchdog only protects new objects); client-side failover; 
- Mitigation for finding 1 and for the ~107 ms synced-write latency (`cache=writeback` and others), then re-measure.
- Public range, student access model, LXC hosts, HA virtual router pair (needs the real uplink).

## Result of the final cycle (2026-10-29, 16:25 to 16:32)

`just down` then `just up`, nothing done by hand: shutdown 1 min 48 s until all 10 nodes were off (no node cut); cold start 5 min 10 s from power-on to a finished `just up` with 0 failed tasks; afterwards Galera 3, 10 hosts on, 16 OSTs active, hooks loaded, bind mount on all 10 nodes and **all 5 VMs running again by themselves** (powered off by the shutdown, resumed by the start). Four cycles were needed; each one exposed a defect the earlier ones could not show (table above). Not tested: a cold start after a power cut (no clean shutdown), and a cold start with a node missing.
