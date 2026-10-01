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
