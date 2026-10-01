# 14 - Test plan: making the data and the system "stable"

Written 2026-10-01 after reading notes 00-13. Nothing here has been run yet. "Stable" has two meanings: trustworthy numbers (R3) and a system that survives reboots and node loss (R4, R5).

## 1. Trustworthy numbers (R3, "limited only by SATA3")

| Test | Why |
|---|---|
| Cache-bypassed re-run of the Lustre fio runs (`O_DIRECT`, drop caches, working set larger than aggregate RAM, 8 x 64 GiB) | Tuned read 12.2 GB/s and BeeGFS read 10.1 GB/s are above the 8.6 GB/s disk ceiling, so probably client cache (note 12 open question). |
| Bare-SSD baseline per node and aggregate, same fio parameters | Real ceiling is about 250 MB/s write, 530 MB/s read per SSD. Chart line should use it, not the spec value. |
| Repeat each config at least 5 times, cold and warm, report mean and stddev | Notes have single runs. |
| Scaling on 1, 2, 4, 8 clients | Thesis scope: results must scale per blade. |
| Same tool for every filesystem (fio, identical parameters) | Dataset mixes dd, fio, beegfs-bench, rados bench. |
| Re-run Lustre default, tuned, FLR+tuned with one script; store date, drive_type, valid, client_count in the JSON | March 2026 results are missing from `data/`; January dd runs make RDMA look worse than TCP. |
| ib_read_bw / ib_write_bw between node pairs, `lnet_selftest` | Backs the "IB has 12x headroom" claim. |
| Latency and IOPS (4k random, QD1 and QD32) | None in the dataset; VM datastores care about this. |
| Metadata test (mdtest: create, stat, delete of many small files) | Not covered; MDT is one SSD per head. |
| Pool drive type decision (owner: HDD, repo: SSD) | Label every run with drive type, or the SATA3 ceiling argument is invalid. |

## 2. System stability (R4, R5)

- Repeated cold boots: 5-10 full IPMI power cycles, log time to `/mnt/lustre` on every node, note any manual repair. Notes have one validated run (4:26).
- Single compute node loss under load: fio running, power off one blade via IPMI, check FLR keeps I/O going, stall length, data intact (checksums), resync time on return.
- Head node loss: reboot Head-1 (MGS + MDT) under load; notes cover idle reboots only.
- MDT recovery with `abort_recov`: does it drop in-flight client state?
- Soak: fio 24-72 h mixed read/write; watch throughput drift, `lctl` errors, dmesg, RDMA queue-pair wedges.
- Integrity: write files with known checksums, power-cycle, verify; `lfs mirror verify` on FLR files.
- Degraded performance with one mirror missing vs healthy.
- Reboot-order and partial-power tests (lab breaker means blades may be missing).

## 3. VM layer (R8), blocked until KVM hosts exist (OpenNebula stage 11+)

- Live migration time under I/O load.
- VM disk fio on the Lustre datastore (`O_DIRECT` alignment; oVirt failed here).
- Node loss with VMs running.

## Order

1. Cache-bypass baseline plus repeated Lustre runs (fixes the dataset and the main claim).
2. Cold-boot loop and node-loss test (backs "stable").
3. Latency, metadata, soak.

Idea: a `just bench` recipe or playbook running a fixed fio matrix and emitting JSON in the `benchmark_data.json` schema.
