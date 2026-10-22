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

## Host-failure test: started, not finished

Hard power-off (`sysrq o`) of Compute-5 (runs VM t2; holds OST8/9, i.e. all of its `pool_b` copy) at 18:15 with the `host_error` hook installed (`-r -p 2`: recreate on another host after 2 minutes). The follow-up step (deactivating the two dead OSTs on the MDTs, the manual stand-in for the missing watchdog) was blocked by the session's permission classifier, and the cluster was shut down for the day before OpenNebula marked the host failed. **No result yet** for VM recovery after host loss or storage-node loss with a VM running. Compute-5 needs a cold boot at the next start.

## Open

- Host-failure and storage-node-failure recovery with a VM; dead-OST watchdog.
- Mitigation for finding 1 and for the ~107 ms synced-write latency (`cache=writeback` and others), then re-measure.
- Public range, student access model, LXC hosts, HA virtual router pair (needs the real uplink).
