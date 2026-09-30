# 08 - March 2026: redeploy after downtime, tuning, K3s, benchmark suite

Date: 2026-03-26 (commits `acc67cb`, `24a25a9`). Cluster was down about 2 months after 01-14.

## Redeploy fixes

- Emergency mode on boot: `nofail` added to all Lustre `fstab` entries.
- IB transport: datagram mode instead of connected.
- MDT disk auto-detect: pick the non-OS disk (LVM-aware).
- Rocky 9 repo name: `powertools` became `crb`.
- Redundant XFS storage prep removed from stage 1.

## Lustre tuning (fio, 8 nodes, aggregate)

| Config | Write | Read |
|---|---|---|
| Default | 401 MB/s | 3.6 GB/s |
| Tuned (stripe=4, RPCs=32, dirty=64 MB) | **2.6 GB/s** (20.7 Gb/s) | **12.2 GB/s** (97.9 Gb/s) |
| FLR 2 mirrors + tuned | 2.1 GB/s (17 Gb/s) | 9.1 GB/s (73 Gb/s) |
| Bare SSD baseline (per node, no FS) | ~250 MB/s | ~530 MB/s |

Reads near line rate are partly cache/striping effect above raw SSD rate (8 x 530 MB/s = 4.2 GB/s), so 12.2 GB/s is likely client-cache-assisted. Worth caveating in the thesis.

## Benchmark infrastructure

`benchmark.yml`, `benchmark-ssd-baseline.yml`, `network-benchmarks.yml`, `setup-ssd-benchmarks.yml`; JSON per node/run under `benchmarks/` (48 files, 19k lines, 2026-03-26 12:21 to 12:40), and `historical_comparison.csv` merging all filesystems. Raw logs in `logs/` (Compute-2, Compute-3 install/Lustre logs, `install.log`).

## K3s v1.32.4 on Lustre (stages 7-11)

HA embedded etcd, tainted heads, 8 workers; MetalLB L2 (192.168.1.200-220); Nginx Ingress; self-signed TLS + Dashboard; Prometheus + Grafana. Worked but planned to be replaced (dead Dashboard Helm repo, basic-auth hacks).
