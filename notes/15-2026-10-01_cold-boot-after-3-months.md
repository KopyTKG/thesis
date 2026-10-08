# 15 - 2026-10-01: cold boot after ~3 months off

First stability test (note 14, section 2). All 10 nodes powered on together via IPMI (`just up`).

## Result (about 10 min after power-on)

- Head-1, Head-2: `lustre-startup` OK, `/mnt/lustre` mounted (Head-2 booted 13:14, Head-1 13:17; MGS mounted 13:17:52, clients complete 13:19:39 / 13:19:46).
- Compute-1..8: `lustre-startup` **failed**, no mount. Log: `FATAL: MGS not reachable after 300s` (13:16:15 to 13:19:03 wall, only 168 s).
- IB itself fine afterwards: ibs1 ACTIVE 100 Gb/s EDR, OpenSM active on heads, IPoIB ping Compute-1 to Head-1 works. So the failure was timing, not hardware.

## Causes

1. **Bug in `wait_for_mgs`** (`/usr/local/sbin/lustre-startup`): `count` grows by 10 per loop but each loop is only about 2 s (`sleep 2`, failed `lctl ping` returns quickly), so the "300 s" timeout is really about 60-170 s.
2. **Boot skew**: Head-1 (holds the MGS) came up about 2.5 min after the computes. A real 300 s wait would probably have covered it.
3. Nothing in the orchestrator retries after FATAL, so the nodes stay unmounted until someone restarts the unit.

Fix idea: use `$SECONDS` for the deadline, and/or make the unit `Restart=on-failure`. Not applied yet.

Side findings: `ansible.cfg` key path `~/.ssh/ujep_lab` does not exist here; key is at `~/.ssh/thesis/ujep_lab`. `user` needs a sudo password (vault).

## Baseline for the reboot test (before `just reboot`)

Reported by the owner, 2026-10-01, after restarting `lustre-startup` on the computes and running `just update` (kernel pinned by `exclude: kernel*`; Compute-6..8 update still pending at that point):

- MDT0 and MDT1, OST0..OST15 present (16 OSTs, 3.7 TB raw). Earlier the same day Head-1 `lfs df` showed only 14 OSTs (OST5, OST7 missing, 3.2 T), before the computes were restarted.
- Kernel on nodes: `5.14.0-611.13.1_lustre.el9.x86_64`.

Compare after the reboot with `just status` and `lfs df -h`: every node `mount=yes`, computes `osts=2`, heads `osts=0`, 16 OSTs + 2 MDTs, same kernel.

Observed during the update: Compute-6 console right after boot showed `MGC10.0.0.251@o2ib: failed processing log rc=-5` then `-110` at 20-30 s (client mount tried before the MGS answered); not yet checked whether it recovered.

## Result of the first `just reboot` (serial, heads first)

- 9 of 10 nodes back on `5.14.0-611.13.1_lustre.el9`, `lustre-startup` active, client mounted (Compute-3: unit reports mounted, lctl shows the client LOV UP, but a non-root `mountpoint` got "Permission denied"; re-check as root).
- **Compute-2 booted the stock kernel `5.14.0-687.50.1.el9_8`.** It was the node updated in the first run, before the `kernel*` exclude existed; `UPDATEDEFAULT=yes` made the new kernel the boot default. No Lustre modules, so `lustre-startup` failed with `LNET not up after 60s` and OST2/OST3 were offline. Only Compute-2 has an el9_8 kernel installed.
- Confirms the update risk is real, not theoretical. Fix: `grubby --set-default` back to the lustre kernel, `UPDATEDEFAULT=no` in `/etc/sysconfig/kernel` on all nodes.

## Cold-boot baseline: 3 runs, current (unfixed) `lustre-startup`

`just coldboot 3` (full shutdown, then IPMI power-on of all 10 nodes at once). Data: `UJEP-LAB/benchmarks/stability/coldboot.csv`.

| Run | Started | Mounted on | Time until all mounted (from end of power-on playbook) |
|---|---|---|---|
| 1 | 15:32:38 | 10/10 | 172 s |
| 2 | 15:39:18 | 10/10 | 177 s |
| 3 | 15:45:56 | 10/10 | 189 s |

**0 failures in 3 runs.** The 3-month cold start (all 8 computes failed) did not reproduce.

Caveats on the CSV itself:
- Every node gets the same time per run: the poll covers the whole cluster and runs every ~15-20 s, so resolution is one poll, and the clock starts when `startup.yml` finishes, after the sequential IPMI power-on loop. Not time since the first node was powered.
- Per-node detail is better taken from `journalctl -u lustre-startup -b` (run 3, from the logs).

Run 3, from the journals:
- Head-2 and the computes started `lustre-startup` at 15:50:15 to 15:51:02; **Head-1 (holds the MGS) only at 15:51:59**, about 1.5-2 min after the rest. MGS reachable at 15:52:00 for everyone; all nodes complete 15:52:06 to 15:52:14.
- Longest MGS wait: Compute-1 / Compute-2 / Head-2 about 90-105 s; Compute-8 about 58 s.
- The 2026-10-01 first failure had Head-1 up about 2.5 min after the computes (13:17 vs 13:14-13:16). Head-1 consistently boots last, so the MGS is the gating item every time.

Reading: the script's real MGS wait limit is about 170 s (the `count+=10` bug), against a longest wait of about 105 s in these runs, so a margin of roughly 65 s. It passed here because Head-1 lagged by about 100 s; the failure case needed about 150 s+. 3 passes do not show the bug is harmless; they show the slack is not always exhausted. Next: apply the fix (`$SECONDS` deadline, `Restart=on-failure`) and run 5 more cold boots, ideally with a deliberately delayed Head-1 to test the limit.

Improvement for the test tool: record per-node `lustre-startup` begin/complete times from the journals and time since the first IPMI power-on, instead of one cluster-wide poll time.

## Before / after the `lustre-startup` fix (`just coldboot`, per-node data in `benchmarks/stability/coldboot_v2.csv`)

Fix: `$SECONDS` wall-clock deadlines (MGS 600 s, LNET 120 s) and `Restart=on-failure`. Verified deployed on the nodes (journal shows `MGS reachable after Ns`, unit has `Restart=on-failure`). Head-1 (MGS) boots about 190 s after its own power-on versus about 90 s for the other blades, so it is always the last node up.

| Script | Head-1 held off | Runs | All mounted | Longest MGS wait | Notes |
|---|---|---|---|---|---|
| legacy | 10 s | 2 complete + 1 interrupted | 2 of 2 complete runs 10/10; run 3 Compute-2 FATAL after 145 s, stayed unmounted, half-mounted OSTs (OST0002 only) | 157 s | legacy limit is about 145-170 s, waits were 102-157 s: no margin, a coin flip |
| fixed | 10 s | 3 | 3 of 3, 0 fatal retries | 148-158 s | same waits that killed Compute-2 now pass |
| fixed | 240 s | 1 | 1 of 1, 0 fatal retries | 344 s | Head-1 OS up at 435 s; computes waited 293-344 s (about 2x the legacy limit); all mounted by 467 s; `lfs df` 16 OST / 2 MDT |

Still to test: Head-1 held 600 s (past the 600 s deadline, exercises `Restart=on-failure`), hard power-off, integrity across a cold boot, repeated reboots, node loss.

Not tested (skipped for time, 2026-10-01): the `Restart=on-failure` path (Head-1 held about 600 s so the computes exceed the 600 s deadline). The retry behaviour is configured and deployed but unproven; the deadline fix itself is proven by the 240 s run.

## Hard power-off cold boot (`just coldboot 2 --hard`, fixed script, 17:14)

Both runs: 10/10 nodes mounted, 0 fatal retries, MGS wait max 97-101 s, all complete by 230 s (Head-1 OS up at 196-199 s). Per-node CSV: `benchmarks/stability/coldboot_v2.csv`.

- Run 1: `lfs df` 16 OST / 2 MDT, HEALTHY.
- **Run 2: `lfs df` from Head-1 showed only 14 OSTs; OST0000 and OST0001 (Compute-1's) missing**, although Compute-1 reported mounted and serving 2 OSTs. Not seen in any graceful run. The check was a single snapshot at about 230 s, so it is unknown whether this was a short delay (MDS not yet reconnected to freshly recovered OSTs after the unclean stop) or a stuck OST.
- Follow-up: the test now polls `lfs df` for up to 300 s after all nodes are mounted and records the time until 16 OST + 2 MDT are visible (`coldboot_settle.csv`).

## Hard power-off + integrity (`just coldboot 2 --hard --integrity 40`, 17:31 and 17:45, fixed script)

- **Integrity: 40 of 40 files sha256-identical after both unclean power-offs** (`V SUMMARY ok=40 bad=0 err=0`, 69 s and 63 s). Files were written by `dd oflag=direct` from Compute-1, then all 10 nodes had power cut by IPMI with Lustre mounted.
- Nodes: 10/10 mounted both runs, 0 fatal retries, MGS wait max 101-103 s, unit complete by 231-254 s after power-on.
- **But the filesystem was not fully usable for another 275-292 s**: for that long `lfs df` showed only 2 of 16 OSTs (Compute-1's), then 16. So after an unclean stop, time from power-on to a complete pool is about 8.5 min, not about 4 min. After graceful shutdown the pool was complete immediately (16 OST on the first check).
- Cause (from `dmesg` on Compute-4): the OSTs mount in recovery: `OST0006: Will be in recovery for at least 5:00, or until 2 clients reconnect` and `Denying connection for new client lustrefs-MDT0000-mdtlov_UUID (at 10.0.0.251@o2ib), waiting for 2 known clients (1 recovered ...) to recover in 4:59`. The MDTs are mounted with `-o abort_recov` (`lustre-startup` line 112), so MDT0 reconnects as a new client and the OSTs refuse it until their 5 min recovery window expires. The OST mounts (fstab, via `start_osts`) have no `abort_recov`.
- Earlier single-snapshot observation (14 OST after hard run 2 at 17:14, Compute-1's OSTs missing) was the same effect seen at a different moment.
- Candidate fix: `abort_recov` on the OST mounts as well. Trade-off: after a total power loss no client survives to replay, so nothing is lost; for a single OSS crash while other clients are active it would evict those clients instead of letting them replay. Not applied; needs a decision and a re-run.

**Decision (owner, 2026-10-01): `abort_recov` is NOT added to the OST mounts.** In production the cluster runs on two separate power lines, each with 2 UPS, and shutdowns are scheduled, so a whole-cluster dirty stop is not an expected event. Keeping OST recovery lets live clients replay in-flight writes when a single node crashes, which is the case that matters. Consequence: shutdown must be graceful (`just down`); after a total unclean stop expect about 5 extra minutes before all 16 OSTs are visible (data intact, 40/40 files).

## 2026-10-08: cold start after a week off, then node loss (Compute-5)

Week-cold start (`just coldboot 1 --no-shutdown`): 10/10 mounted, 0 fatal retries, Head-1 OS up at 190 s, longest MGS wait 101 s, all units complete by 226 s, pool fully visible after 5 s (16 OST + 2 MDT). The last shutdown had been graceful, so no OST recovery delay.

Node loss (`just nodeloss Rocky-Compute-5`, 80 mirrored files pinned: mirror A on Compute-5's OST8, mirror B on Compute-8's OST14; writer on Compute-1; log `benchmarks/stability/logs/nodeloss_*`; result `nodeloss_*.json`):
- Mirror placement check passed (`lfs mirror create -N1 -c1 -o 8 -N1 -c1 -o 14`).
- 11 files completed before the power-off, 1 write failed (in flight when the node died).
- **Verify #1 (victim still down): ok=0, err=11.** The surviving mirror was NOT used: reads failed. After the node returned: ok=11 bad=0 err=0. After resync: ok=11 bad=0, `lfs mirror verify` mismatch=0. No data lost.
- **Resync: stale=12 resynced=12.** Every file written was stale on the second mirror until the manual resync: FLR is delayed (asynchronous) mirroring, writes land on one mirror only. Without a periodic resync, a node loss makes recent data unavailable, and a destroyed disk would lose it.
- **No failover, I/O blocks.** Client: `Connection to lustrefs-OST0008 (at 10.0.0.5@o2ib) was lost; in progress operations using this service will wait for recovery to complete`; restored 14:15:20. The in-flight write took 946 s (until the node returned). A metadata probe creating new files hung 936 s (max latency; 1 of 53 failed); Head-1 logged the same wait for OST0009 (`osc-MDT0000`). New-file creation appears to stall while an OSS is down.
- Caveat: the test waited about 10 minutes for the hung writer before powering the node back on, so the outage was about 13 minutes (`t_back - t_kill` = 959 s), not the planned 90 s. Recovery after power-on: mounted 137 s, pool HEALTHY.
- Consequence for R5: with the current layout and defaults a blade loss freezes I/O and creates until the node is back; mirrors protect data only after resync. Open: do resynced mirrors give read failover, and does deactivating the dead OST on the MDS/client keep work going? (next test)

## 2026-10-08: read/write/create behaviour during a node loss, mirrors resynced first (`just readfail`)

Setup for all three runs: 20 mirrored files (mirror A on Compute-5's OST8, B on Compute-8's OST14) written and **resynced before the failure** (`stale=20 resynced=20`, mirror verify 0 mismatches). Client Compute-1 runs three jobs at once: reader (round-robin reads of the 20 files), writer (overwrites mirrored files whose first mirror is on the victim), create-probe (a new file every second, default layout). Compute-5 is hard-powered off for 240 s, then powered on. Raw: `benchmarks/stability/readfail_*.json` and logs.

| | (a) first run, reads only | (a2) no action | (b) OSTs 8,9 deactivated on MDS+client at +38 s |
|---|---|---|---|
| Reads during outage | 246 ok, 1 failed, slowest 40.7 s | 292 ok, 1 failed, slowest 3.3 s | 114 ok, 1 failed, slowest 4.2 s |
| Writes during outage | n/a | **0 completed**; 1 write blocked 358 s until the node returned, then rc=124 | 21 ok; 1 failed after 51 s (in flight at the loss); then normal |
| New-file creates during outage | n/a | 10 ok, then 1 `touch` **blocked 344 s** (until the node returned) | 180 ok; 1 failed after 56.7 s; then normal (324 creates in total) |
| Data after return | 20/20 ok | 20/20 ok, 8/8 written ok | 20/20 ok, **38/38 written ok** |
| Pool fully visible after node mounted | 2 s | 2 s | 128 s (MDS reconnect after re-activation) |

Findings:
1. **Read failover works automatically if the mirrors are in sync**: no manual step, 0 read errors after the first in-flight one, stall 3-41 s once. The earlier `ok=0 err=11` was caused by stale mirrors (nothing resynced), not by FLR being unable to fail over.
2. **Writes and creates do not fail over by themselves.** Writes to a file whose first mirror is on the dead node, and creates whose objects the MDS allocates on the dead node's OSTs, block until the node is back (here 344-358 s, about the whole outage).
3. **Deactivating the dead OSTs on the MDS and the client (`lctl set_param osp.<OST>-osc-MDT*.active=0`, `osc.<OST>-osc-*.active=0`) makes writes and creates continue**; writes went to the surviving mirror and were intact (38/38). The only disruption was the operations in flight at the failure (51-57 s, then an error). The deactivation was manual at +38 s; the in-flight stall is roughly the detection plus obd timeout, so automating it bounds the disruption to about that. After the node returns the OSTs must be re-activated (the script does); files written during the outage have a stale mirror and need `lfs mirror resync`.
4. **FLR redundancy therefore needs two operational pieces that Lustre does not provide on its own here**: a periodic `lfs mirror resync` (data written since the last resync exists only on one mirror), and an automatic OST deactivation on node failure (watchdog). Without them a blade loss stalls writes/creates for the whole outage and recent data is unavailable until the node returns.

## 2026-10-08: loss of Head-2 (MDT1) under load (`just nodeloss Rocky-Head-2`)

Head-2 hard-powered off 47 s into continuous writes (plain files, writer + create-probe on Compute-1); outage about 360 s in total (back at `t_back`).
- **Data intact: 25 of 25 completed files sha256-identical after the return**, pool HEALTHY (16 OST, 2 MDT).
- **Operations stalled**: the write in flight at the loss blocked the full 240 s (killed by `timeout`, rc=124, 1 failed file); 2 of 53 create-probe `touch` calls failed after 60 s each (rc=124). Other operations kept completing.
- Cause (mechanism confirmed, this run's directory not inspected because the test deletes it): `lfs getdirstripe -D /mnt/lustre` shows `lmv_stripe_offset: -1`, `lmv_max_inherit_rr: 3`, and new subdirectories alternate between MDT0 and MDT1 (`0 1 0 1 0 1`). The test directory therefore lives on one of the two MDTs; when that MDT's head is down, everything in that subtree (creates, opens) blocks.
- **The metadata layer is not redundant.** DNE spreads the namespace across MDT0 (Head-1) and MDT1 (Head-2); each MDT is one SSD in one head with no failover partner. Losing a head makes the directories on that MDT unavailable until it is back (data on the computes is untouched). FLR protects file data only. This is the "fully clustered" caveat for the thesis (Selection.md): clustered data, not clustered metadata.

## 2026-10-08: loss of Head-1 (MGS + MDT0) under load (`just nodeloss Rocky-Head-1`)

Head-1 hard-powered off 47 s into the load; outage `t_back - t_kill` = 531 s (Head-1 OS up about 190 s after power-on, MGS/MDT0 mounted, `recovery_to_mount_s` 230).
- Client log (Compute-1): 15:08:46 `Connection to lustrefs-MDT0000 was lost; in progress operations using this service will wait for recovery`; 15:09:19 `MGC ... Connection to MGS was lost; in progress operations using this service will fail`.
- The write in flight at the loss blocked **562 s** (until MDT0 was back). 1 write failed (`w_00028`), 28 completed; 2 of 53 create-probe calls failed after 60 s.
- **After the return the client was evicted: `This client was evicted by lustrefs-MDT0000; in progress operations using this service will fail.`** Cause: the MDT is mounted with `-o abort_recov` (`lustre-startup`), which skips recovery by evicting all client sessions. The first 2 read-backs after the return failed with I/O errors (`ok=26 bad=0 err=2`); the other 26 were intact, pool HEALTHY. The two files were deleted by the test cleanup, so whether they were readable on a retry is unknown.
- Consequence for the VM layer: files held open on the Lustre mount (VM disk images) get I/O errors when a head restarts with `abort_recov`. For scheduled maintenance stop the VMs first, or remove `abort_recov` from the MDT mount when clients are alive (then clients replay and keep state, at the cost of a recovery window of up to 5 min). `abort_recov` is only right for a full cold start.
- Summary of the three loss tests: compute loss = reads fail over (if mirrors in sync), writes/creates stall unless the dead OSTs are deactivated; Head-2 loss = the directories on MDT1 stall; Head-1 loss = root and half the namespace plus the MGS stall and clients are evicted when it returns. No data lost in any of them.

## 2026-10-08: rolling reboot (`just rebootloop 2`, started 15:19)

- **Loop 1: all 10 nodes rebooted in turn (heads first, then Compute-1..8), each passed its `/mnt/lustre` check; `lfs df` 16 OST / 2 MDT, HEALTHY.**
- **Loop 2 failed at Head-2** (`Wait for /mnt/lustre to be mounted`, 30 x 10 s, rc=32). `lustre-startup` was still `activating`, blocked in `lctl ping`. Cause is the InfiniBand fabric, not Lustre: Head-2's port was `INIT` (physical `LinkUp`, 100 Gb/s), never `ACTIVE`, so `ibs1` stayed `DOWN`, IPoIB could not reach Head-1 and LNET reported `ptlrpc_init_portals() network initialisation failed rc = -22 / -100` and `1 local NIs in recovery`. No subnet manager activated the port for about 10 minutes.
- OpenSM state: Head-1's SM went `STANDBY` at 15:48:23 and Head-2's at 15:50:45; neither has ever logged `Entering MASTER`. Both logged repeated `Timeout while getting attribute 0x20 (SMInfo); Possible mis-set mkey?`. `sm_priority` is 0 everywhere. **OpenSM runs on all 10 nodes** (`systemctl is-active opensm` = active on every node); the master moves with every reboot (Compute-5 last `Entering MASTER` 15:37:36, 6 master entries; Compute-7 5 entries, standby since 15:41:47).
- Recovery: `systemctl restart opensm` on Head-1 only; within seconds Head-2's port went `ACTIVE`, `ibs1` `UP`, `lustre-startup` completed and mounted, cluster HEALTHY. Why the then-master (probably Compute-5) had not swept the port itself is unproven.
- Conclusion: a rolling reboot with SMs on every node and equal priority can leave a freshly rebooted node with a port stuck in `INIT`; the Lustre startup wait (600 s) just waits. Candidate fixes (not applied, need a decision): run OpenSM only on the two heads with explicit `sm_priority` (e.g. Head-1 14, Head-2 13), disable it on the computes; make `reboot.yml` wait for the IB port to be `ACTIVE` before the Lustre check and before moving to the next node; then repeat `rebootloop`.
- This also means the earlier clean cold boots depended on SM election going well each time.

## 2026-10-08: subnet-manager fix and rolling reboot repeated (`just opensm`, `just rebootloop 3`)

Fix applied 16:32 with `playbooks/setup_opensm.yml` (reversible with `-e opensm_everywhere=true`): `PRIORITY=14` on Head-1 and `13` on Head-2 in `/etc/sysconfig/opensm` (the launcher passes it as `-p`), OpenSM stopped and disabled on the 8 computes. Heads first, so the higher-priority head takes over from whichever node was master; Head-1 logged `Entering MASTER`, Head-2 `Entering STANDBY` within 8 s; the cluster stayed HEALTHY (16 OST / 2 MDT). `reboot.yml` now also waits for the node's IB port to be ACTIVE before the Lustre mount check.

Rolling reboot with the new layout (heads first, then Compute-1..8, serial, 3 loops, 16:32 to 17:50):

| Loop | Result | Duration |
|---|---|---|
| 1 | all 10 nodes passed, HEALTHY | 1540 s |
| 2 | all 10 nodes passed, HEALTHY | 1533 s |
| 3 | all 10 nodes passed, HEALTHY | 1521 s |

Before the fix: loop 1 passed, loop 2 failed (Head-2 IB port stuck in INIT). After: 3 of 3 passed. Evidence that the shared-SM layout was the cause is circumstantial (same test, 1 failure in 2 before, 0 in 3 after) and the sample is small; not proven. Open: why the old master (a compute) did not activate Head-2's port is still unexplained.

## 2026-10-08, evening: soak not run

A 6-hour soak (`just soak 6 --stop-on-fail`, mixed 70/30 fio on all computes) was started at 17:58 and stopped after about 30 s at the owner's request (the cluster cannot stay on that long today). No soak data exists; `benchmarks/stability/logs/soak_20261008T175853.log` only shows the healthy start state (16 OST, 2 MDT). The soak is still open (R4 long-run stability); planned for a session where the cluster can run for several hours. Cluster shut down gracefully (`just down`) at the end of the day.
