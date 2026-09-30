# 13 - `data/` folder: thesis benchmark dataset and charts

Location: `~/Projects/thesis/data/` (Bun project, created around 2026-09-08 per file dates). Files: `benchmark_data.json` (9 KB), `index.ts` (chart generator), `read_performance.png`, `write_performance.png`, `package.json` (canvas, chart.js, chartjs-plugin-annotation). Run with `bun run index.ts`. Charts use UJEP teal `rgb(3,126,134)`, Czech titles ("Naměřené rychlosti čtení (MB/s)"), a dashed red "Theoretical HW Max" line.

## What the dataset contains

`metadata`: 10 nodes (2 head + 8 compute), 2x E5-2650 v4, 64 GiB, Samsung MZ7TY256 SATA III, **16 SSDs**, 2 per compute node, ConnectX-5 EDR, SB7790. Units MB/s (1 MB = 10^6 B); BeeGFS converted from MiB/GiB. Tool settings: fio 4 GB file, 1 MB block, iodepth 16, numjobs 4, libaio, direct=1; BeeGFS 1 MiB, 10 GiB, 5 tasks; Ceph rados bench 4 MB block, 16 ops; dd direct 1 GB.

`theoretical_limits`: per SSD 540 read / 520 write MB/s (spec, SATA III 600 MB/s); 16 SSDs = **8640 read / 8320 write MB/s**; one IB link 12,500 MB/s; 8 links 100,000 MB/s. Stated bottleneck: SATA SSDs, "InfiniBand has 12x headroom".

`benchmarks` (aggregate write / read, MB/s):

| Entry | Write | Read | Tool | Note |
|---|---|---|---|---|
| Lustre 2.15.4, TCP, Rocky 8.10 | 1563 | 3254 | fio | two freshly-integrated nodes drag it down |
| Lustre 2.17.0, RDMA, Rocky 9.7 | 1380 | 2770 | dd | 8-node parallel |
| Lustre 2.17.0 RDMA + FLR | 1096 | 3648 | dd | per-node values estimated; 17% mirror overhead |
| NFS + Pacemaker + TargetCLI | 11017 | 18639 | fio | own note: likely client-cache effects |
| GlusterFS (IPoIB) | 1182 | 4110 | fio | RDMA removed |
| BeeGFS Community | 4660 | 10104 | beegfs bench | RAID0 only; final test |
| Ceph 16x SSD, 2 replicas | 682 | 2313 | rados bench | |
| Ceph 16x SSD, 1 replica | 1077 | 3058 | rados bench | best Ceph, values from different runs |

`summary_for_plotting` holds the eight bars used by the two PNGs.

## Problems to fix before using in the thesis

1. **Lustre is shown at its worst.** The dataset stops at the January dd runs. The March 2026 fio results are missing: tuned **2593 write / 12238 read**, FLR + tuned **2134 / 9087**, default RDMA 401 / 3616, and the bare-SSD baseline (~250 write / ~530 read per SSD). Source: `UJEP-LAB/benchmarks/historical_comparison.csv` and the 48 JSON files. In the current charts Lustre RDMA (2770) even looks worse than Lustre TCP (3254), which is a dd-vs-fio artifact and would mislead a reader.
2. **NFS bars are invalid.** 11,017 / 18,639 MB/s exceeds what 16 SATA SSDs can deliver (8320 / 8640) and the CSV marks the rows INVALID (RAM cache). It dominates the read chart. Exclude it, or plot it hatched/annotated as invalid.
3. **Values above the hardware line are not real disk speed.** NFS, BeeGFS read (10,104), and the tuned Lustre read (12,238) are all above the 8640 MB/s read ceiling, so they include cache. Either re-measure with cache bypass or mark them. The write ceiling of 8320 is also the spec value; measured bare SSD write is ~250 MB/s (fio), giving ~4 GB/s for 16 SSDs. The red line should probably show measured baseline (8 nodes x 2 SSDs x ~250/530) as well as spec.
4. **Mixed tools** (dd, fio, beegfs bench, rados bench) on one axis. The metadata notes this but the chart does not.
5. **Ceph metadata mismatch**: entries say OS Rocky 8.10, but the log says Ceph ran on **Rocky 10.0** (2025-10-30) with an extra controller node. The "2 replicas / 128 PGs" configs are inferred from CSV notes, not from a labeled run; the 2-replica bar (682) is actually the "16x SSD" default run and the 1-replica bar mixes two runs.
6. **Gluster write aggregate**: CSV note says 982 but the eight per-node values sum to **1182**, which the JSON uses. I corrected notes 06 and 11 to 1182.
7. **BeeGFS numbers differ from the CSV** (4660 / 10104 here vs 4424 / 7676): JSON uses the FINAL TESTING run (4.34 / 9.41 GiB/s), CSV the earlier 16x SSD run (7.15 GiB/s read).
8. **Missing series**: no HDD run (Ceph 16x HDD 211 / 619 MB/s, BeeGFS 16x HDD 2.80 GiB/s write exist in the docs), no cold-boot/stability metric, no latency or IOPS, no small-file/metadata test. Owner says compute pool drives are HDD, dataset says SSD (see note 12).
9. Dates are absent from JSON entries; add test date and drive type per entry.

## Suggested fixes (not done)

- Add March 2026 Lustre fio entries (default, tuned, FLR + tuned) and the bare-SSD baseline as its own bar/line; regenerate both PNGs.
- Mark NFS invalid; add a "cache-assisted" marker for anything above the ceiling.
- Add fields: `date`, `drive_type`, `client_count`, `valid` to each benchmark.
- Keep one chart per requirement in note 12 (R3 speed, R5 redundancy) rather than one flat bar chart.

I did not modify anything in `data/`.
