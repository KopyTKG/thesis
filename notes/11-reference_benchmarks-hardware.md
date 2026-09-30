# 11 - Reference: benchmarks and hardware

## Hardware

- 2 head nodes (Rocky-Head-1/2, eth 192.168.1.251-252, IB 10.0.0.251-252), 8 compute (Rocky-Compute-1..8, eth .101-.108, IB 10.0.0.1-8), IPMI 192.168.50.0/24.
- Supermicro SYS-6028TR-HTR 2U, 4x X10DRT-H blades (so each blade is one node).
- Per blade: 2x Xeon E5-2650 v4 (24 cores), 64 GiB DDR4 ECC, 1x ConnectX-5 EDR.
- Storage: Samsung MZ7TY256 SSDs (2 per compute node, 16 OSTs), 2x 128 GB on heads for MDTs.
- Switch: Mellanox SB7790 (IB EDR, unmanaged, needs OpenSM on a node).
- OS history: Rocky 10.0 (Oct 2025, Ceph) then Rocky 8.10 (Jan 2026, Lustre 2.15) then Rocky 9.7 (2026-01-13 onward).

## Aggregate results (from `benchmarks/historical_comparison.csv` and docs)

| FS / config | Transport | Tool | Write | Read | Notes |
|---|---|---|---|---|---|
| Ceph 16x SSD | Ethernet | rados bench | 682 MB/s | 2313 MB/s | 1 replica ~1 GB/s write; 3 replicas ~400 MB/s unstable |
| BeeGFS 16x SSD | IPoIB | beegfs-bench | 4424 MB/s | 7676 MB/s | no redundancy |
| NFS | Ethernet | fio | n/a | n/a | INVALID, RAM cached |
| GlusterFS | IPoIB | fio | 1182 MB/s | 4109 MB/s | no RDMA |
| Lustre 2.15.4 | TCP | fio | ~1.5 GB/s | ~3.2 GB/s | Rocky 8.10 |
| Lustre 2.17.0 | o2ib RDMA | dd | 1.38 GB/s | 2.77 GB/s | 2026-01 |
| Lustre 2.17.0 default | o2ib RDMA | fio | 401 MB/s | 3616 MB/s | 2026-03 |
| Lustre 2.17.0 tuned | o2ib RDMA | fio | 2593 MB/s | 12238 MB/s | stripe 4, RPC 32, dirty 64 MB |
| Lustre 2.17.0 FLR | o2ib RDMA | fio | 2134 MB/s | 9087 MB/s | 2 mirrors + tuned |
| Bare SSD | SATA | fio | ~250 MB/s/node | ~530 MB/s/node | raw ceiling, 8 nodes ~2 / 4.2 GB/s |

Comparison caveats: mixed tools (rados bench vs beegfs bench vs fio vs dd); Ceph on Rocky 10 and Ethernet-side controller; NFS invalid; 2026-01 Lustre tests used dd.

## Charts

`~/Projects/thesis/data/` holds `benchmark_data.json` and `read_performance.png` / `write_performance.png` (chart colors updated to UJEP teal, commit `f33de22`).
