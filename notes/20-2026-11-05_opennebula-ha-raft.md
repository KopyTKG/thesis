# 20 - 2026-11-05: OpenNebula frontend HA (Raft) on both heads plus a third voter

Sources: `UJEP-LAB/opennebula/playbooks/stage20_one_ha.yml` (with `tasks/one_ha_join.yml`), the reworked `stage11_restore_stack.yml`, `stage17_fencing.yml`, `common/shutdown.yml`; session of 2026-11-05. Follows note 19 (head loss tests).

## Why

Note 19: oned, the scheduler, the hook manager and the UI ran on Head-1 only. While Head-1 was down nothing managed the lab; a host failure in that window would not have been recovered. The owner asked for OpenNebula on both heads.

## Design

- Three frontends in one Raft zone: Head-1, Head-2 and Compute-1. Raft needs a majority, so two frontends are not enough; Compute-1 is the third voter (it was already the third Galera node).
- A virtual IP `192.168.1.248` follows the leader (OpenNebula's `raft/vip.sh` hooks, interface eno1). The CLI (`~oneadmin/.one/one_endpoint`), FireEdge, the scripts and the monitoring agents use it.
- Database: OpenNebula's HA replicates through its own log (`logdb`); every frontend needs a LOCAL database. The shared Galera cluster (stages 8 and 9) was therefore turned into three standalone MariaDB instances (`wsrep_on = OFF`). Galera had left an identical copy of the database on every node, so nothing was copied: row counts were compared before and after (vm_pool, host_pool, logdb equal on all three). HAProxy and keepalived of the old database VIP are stopped and disabled.
- Everything that is not in the database exists on all three: oneadmin's ssh key, `one_auth`/`one_key` (copied through a temporary directory on the workstation, removed afterwards), `/etc/one`, the IPMI fence script and credentials, the unstick timer (acts only on the node that holds the VIP), `kvmrc` (see below). The dead-OST watchdog stays on the two heads (the MDSs).

## What went wrong on the way (kept, because the playbook was rewritten after it)

1. **First attempt: three standalone frontends.** The playbook registered the servers with a loop that swallowed the error of `onezone server-add`; after the cold copy all three opened as independent leaders on three independent databases, and all three put the VIP on their interface. Noticed from `vip=1` on all three nodes and from a zone without servers; Head-2 and Compute-1 were stopped at once and the VIP removed there. Lesson: the zone must be verified before followers start.
2. **Order of registration.** With the leader alone the quorum is one, so registering head1 and head2 commits. Registering a third server then needs head2 running (two of two): the add timed out and the leader could not commit (INDEX 30, COMMIT 29) until head2 was running with a copy of the leader's database. Correct order: register head1 and head2, copy the database live and start head2, register compute1, copy and start compute1. (Also: a duplicate `head1` was created by running `server-add` twice; removed with `server-del`.)
3. **Monitoring agents pointed at the old leader.** The agents on the hosts report to a monitor address that defaults to `"auto"`, i.e. the address of the frontend that started them. After the first failover (leader stopped at 15:39:09, new leader and VIP moved in 8 s) they still reported to Head-1; within about 3 minutes OpenNebula would have flagged every host as failed and the `host_error` hook would have **fenced healthy hosts**. The hook was removed in time and `monitord.conf` now sets `MONITOR_ADDRESS` to the VIP. Steady state was verified: the last-monitoring time advanced by 120 s without the agent being restarted.
4. **`onehost sync` pushes the local `remotes`** of whichever frontend leads. The only customisation, `kvmrc` (`MIGRATE_OPTIONS=--unsafe`, live migration on Lustre), existed on Head-1 only: found by diffing the three trees (749 files, one real difference), copied to the others.
5. **False host failure after a head came back** (below): the fence script now refuses to power off a host that still answers over ssh.

## Tests

| Test | Result |
|---|---|
| oned stopped on the leader (graceful) | new leader within 3 s, VIP on the new leader after 8 s, CLI through the VIP works, VMs untouched; the old leader rejoins as a follower |
| followers restarted one at a time, then the leader | each restart hands leadership to another node in seconds |
| **hard power-off of the leader node (Head-1, 15:52:00) and 20 s later of Compute-7 (runs t1)** | new leader (Head-2) at once; Head-1 flagged 3 min 20 s after the cut, Compute-7 3 min 25 s after; the hook on the new leader fenced Head-1 over IPMI (15:57:27) and Compute-7, t1 was recreated, cleared by the unstick timer and placed by the new leader's scheduler on Compute-6 (PROLOG at 15:58:11, 6 min after the first cut) |
| same test, after that | t1 stayed in PROLOG while MDT0 (Head-1) was down: the deploy creates its context ISO under `datastores/.isofiles`, a directory on MDT0. After Head-1 returned (oned follower at 16:14:46) the prolog failed with a clone error; a retry (`onevm recover --retry`) brought t1 up at 16:17 |
| false failure (16:15:25) | right after MDT0 came back, the datastore probe `monitor_ds.rb` failed on Compute-5 and Compute-6 with `mkdir: File exists` under `/var/lib/one/datastores` (transient Lustre state after the MDT returned) and both healthy hosts were flagged ERROR; the hook had started and was sleeping before it would fence them. Killed by hand, hosts re-enabled. Fix: the fence script now refuses to fence a host that answers ssh (the hook then recreates nothing) |
| **full `just down` and `just up` on the HA stack** | shutdown 1 min 53 s; `just up` 4 min 51 s from power-on, 0 failed tasks; after Lustre was up the three frontends started, elected a leader and took the VIP within about 20 s; end state: Raft leader + 2 followers at the same committed index (446), VIP on one node, 10 hosts on, 5 VMs running, hook loaded on all three hook managers, 16 OSTs; FireEdge (9869) and XML-RPC answer through the VIP |

## What it does not solve

- The recreate of a VM needs MDT0 (the datastore directory with the context ISO). A head loss still blocks recovery of VMs until the head is back, even with a new leader.
- A returning MDT can make the datastore monitoring fail transiently and flag healthy hosts; the ssh veto prevents the fencing, the host state has to be cleared (disable/enable) by hand or by the next successful probe.
- Running VMs and their disks are unchanged: a loss of Head-2 still makes every VM unmanageable within minutes (note 19), because the VM directories are on MDT1.
- Not verified: the scheduler running on all three frontends at once (no duplicate dispatch seen, not provoked), OneFlow/OneGate through the VIP, a cold start with one frontend missing (two of three is enough in theory), the exact rewritten playbook `stage20_one_ha.yml` from the Galera state onward (the setup was built step by step on the live system and the playbook was rewritten afterwards from the steps that worked; its join order has not been run as code).

## Correction and measurement: what the host-failure recovery really restored (2026-11-05, evening)

The `host_error` hook was set up with `-r` (recreate). In `ft/host_error.rb` that is `vm.delete(true)`: the VM is **redeployed from its image, its state is lost** (the script says so in its header). Every "VM came back" in note 19 and in the tests above was such a fresh VM from the same template; with stateless Alpine guests this was not visible. Measured with a marker file written and synced inside t2 before the host was cut:

| Hook mode | After the host failure |
|---|---|
| `-r` recreate (what ran until now) | t2 up on another host after about 6 min, guest `up 2 min`, **marker file gone**: a fresh VM |
| `-m` reschedule (shared datastore only) | hook: `Fencing success`, `states: 3, 5, 8`, `resched 1` at 16:50:13; t2 running on another host 16:50:17, **5 min 25 s after the power cut** (cut 16:44:52, host flagged 16:48:09), guest `up 0 min` and **marker file present**: the VM restarted from its own disk, crash-consistent |

`-m` is therefore the right mode for this layout (the system datastore is shared on Lustre) and is now the hook definition (stage 17). No unstick step and no scheduler round trip with a fresh clone were needed. What `-m` does not give: it is a crash restart (the guest OS boots again, memory is lost), with the disk state of whatever had reached Lustre (the marker had been `sync`ed; a write that was only in the guest's or host's cache is lost, as after a power cut of a real machine).

## More HA tests (2026-11-05, evening)

| Test | Result |
|---|---|
| **Fence veto** | Hook script run by hand for a healthy host (Compute-2): `Rocky-Compute-2 still answers over ssh, not fencing`, `Fencing error`, the host stayed up and nothing was recreated. A real false failure could not be provoked by blocking the monitoring traffic of a host (55 UDP and 9 TCP packets dropped on its way to the VIP): oned restarts a silent agent over ssh and takes a fresh report through that connection, so a host only turns ERROR while ssh to it fails too. The false error seen after Head-1's return came from the datastore probe instead |
| **Partition of the leader** (traffic on 2633 dropped in both directions between the leader and the two others, 24 s, then healed) | the two others elected a new leader within about 16 s and the new leader took the VIP; **the old leader never stepped down and kept the VIP**, so two nodes held 192.168.1.248 for as long as the partition lasted. After healing the old leader became a follower within about 4 s; the Raft log index was identical on all three (732) and the VM tables hashed identical |
| same, with the **VIP guard** (`one-vip-guard.timer`, every 5 s: a node that holds the VIP and reaches no other frontend on 2633 for 3 checks releases the VIP and stops its scheduler; restores the scheduler when a majority is reachable again) | partition 17:01:10, majority elected 17:01:28, the isolated old leader released the VIP at 17:01:47 (two nodes held the VIP for 19 s instead of for the whole partition), scheduler stopped there, and after healing it started again by itself; same log index (744) on all three afterwards, no divergence |
| **Three schedulers** (one per frontend), six VMs queued at once | all six running within 40 s, **exactly one placement record per VM**, no double dispatch; only the leader's scheduler dispatched; the followers' schedulers only log errors (their local oned refuses writes: 227 error lines on Head-2), noise but harmless |
| **Leader killed (SIGKILL of oned) while four VMs are being deployed and t2 is live-migrating** | new leader (Head-2) within seconds; the four queued VMs were deployed by it and ran within 57 s; **t2 stayed in MIGRATE although the migration had finished** (its domain was running on the target host and the agent answered, gone from the source): the driver's completion message went to the dead oned and the monitoring did not reconcile it; repaired by hand with `onevm recover --success`. In-flight operations whose result goes to the old leader are lost |

## Are acknowledged writes lost when a host is cut? (2026-11-05, evening)

Method: one Alpine guest per disk cache mode. A writer in the guest appends a record to a file, `sync`s, and only then writes the record number to an ack file; a poller on the host reads the ack through the guest agent about 4 times a second and logs it on the host's local disk. The host is then hard powered off (`sysrq o`); the hook (`-m`) reschedules the VM, which boots again from its own disk. Pass: the last record in the data file after recovery (L) is at least the last acknowledged number the poller saw before the cut (U). Placement was chosen so that no VM's disk primary sat on a host that was cut with it.

| cache= | U (last acknowledged seen) | L (after recovery) | Result |
|---|---|---|---|
| `none` | 1310 | 1310 | nothing lost |
| `writeback` | 4543 | 4547 | nothing lost |
| `unsafe` (control: guest flushes are ignored) | 22135 | 22385 | nothing lost |

Reading: no acknowledged write was lost in any mode in this single trial per mode. **The control did not fail, so the test cannot yet tell the modes apart**: Lustre's client writes dirty pages out within about a second, which is shorter than the polling gap, so even `unsafe` had nothing left to lose; a test that separates them needs a write rate and a cut timing that leave data in the host cache (not built). What the three trials do support: with the hook mode `-m` the disk contents that had reached a `sync` survive a host failure for `none` and `writeback` alike. The recovered VM boots again (crash-consistent), the writer is gone, and every record up to the last sync is there.

Side observation of the same run: the dat-wb VM (disk primary on Compute-4) was frozen from the cut of Compute-4 at 17:09 until its OST recovery finished (guest agent answered again 17:20:23, 3 min after the node's return), the same behaviour as the router in note 19.
