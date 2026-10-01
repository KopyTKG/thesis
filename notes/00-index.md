# UJEP-LAB chronological notes

Source: git history and files of `~/Projects/UJEP-LAB` (164 commits, 2025-03-09 to 2026-05-14), plus its docs (`docs/`, `lustre/log.md`, `lustre/ROCKY9_RDMA_BREAKTHROUGH.md`, `benchmarks/historical_comparison.csv`, `opennebula/README.md`).

Pre-repo stage (Overleaf LaTeX, `dump/`) is note `00a`.

Hardware constant across the whole story: 2 head nodes + 8 compute nodes (Supermicro SYS-6028TR-HTR, 4x X10DRT-H blades), ConnectX-5 EDR 100 Gb/s, Mellanox SB7790 IB switch, Samsung MZ7TY256 SSDs on compute nodes. Details in note 11.

## Timeline

| # | Period | Topic | Outcome |
|---|---|---|---|
| 00a | 2025-02 to 03-05 | OS/driver search for ConnectX-5 + IB-only SB7790 (12 attempts, Overleaf paper) | Rocky 9.5 / CentOS Stream 9 + OFED, ~90 Gbps |
| 01 | 2025-03-09 to 03-14 | Mellanox driver/firmware scripts, virt + Pacemaker | Base tooling, DOCA-OFED chosen over MLNX_OFED |
| 02 | 2025-03-18 to 05-18 | OpenStack, then Ceph/Galera, then OpenNebula + Go installer | OpenStack dropped, OpenNebula automated in Go |
| 03 | 2025-10-30 to 11-13 | Ceph on Rocky 10 (OKD dropped) | Ceph rejected, performance |
| 04 | 2025-11-13 to 12-04 | BeeGFS | Rejected, community edition has no redundancy |
| 05 | 2025-12-04 to 12-17 | Ansible rewrite, NFS + Pacemaker + TargetCLI | Rejected, head nodes unstable |
| 06 | 2026-01-05 to 01-08 | GlusterFS (IPoIB only), first Lustre on Rocky 8.10 | Gluster rejected (no RDMA); Lustre 2.15.4 has no IB |
| 07 | 2026-01-13 to 01-14 | Rocky 9.7 + Lustre 2.17.0, BTF-strip trick, FLR | RDMA working, redundancy via FLR |
| 08 | 2026-03-26 | Redeploy after 2 months, tuning, K3s, benchmarks | 12.2 GB/s read tuned |
| 09 | 2026-05-07 | Cold-boot failure, `lustre-startup.service`, kubeadm + Rancher | Lustre stabilized, selected |
| 10 | 2026-05-14 | oVirt rejected, K8s wiped, OpenNebula + Galera | Current state |
| 11 | reference | Benchmark summary, hardware, verdict matrix | |
| 13 | dataset | `data/` folder: benchmark JSON + charts, problems to fix | Needs March 2026 Lustre data |
| 12 | requirements | Cluster shape, constraints, goal R1-R10, candidate scoring | Base for thesis |
| 14 | test plan | What to run to make the data and the system "stable" |

## Filesystem verdicts (final)

| FS | Verdict | Deciding factor |
|---|---|---|
| Ceph | rejected | Software overhead, ~0.4-1 GB/s aggregate at best, unstable with 3 replicas |
| BeeGFS (community) | rejected | Fast (4.3 GiB/s write, 9.4 GiB/s read) but no redundancy without enterprise license |
| NFS + Pacemaker + TargetCLI | rejected | Head nodes failed after every reboot |
| GlusterFS | rejected | RDMA transport removed, IPoIB only |
| Lustre 2.17.0 | selected | RDMA + FLR + stable cold boot |

## Open items / gaps in the source data

- Overleaf paper is internally inconsistent about DOCA_OFED vs MLNX_OFED per OS (see 00a). Lab-draft passwords are in `baseline/credentials-lab-draft.md`; rotate before deployment, do not publish.
- Dates in `historical_comparison.csv` for GlusterFS and NFS (2025-11-01) precede the commits that add their playbooks (2025-12-11 and 2026-01-05). Commit dates are used in these notes; the CSV dates are probably the original test dates, worth checking against the Overleaf data.
- The NFS numbers are flagged INVALID in the CSV (RAM cache despite `direct=1`).
- Early Lustre 2.17.0 numbers (2026-01-14) are `dd`, not fio, so not directly comparable to later fio runs.
