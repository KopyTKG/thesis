# 12 - Cluster shape and requirements

Baseline for everything built on top. Facts from the owner (2026-09-30) unless marked otherwise; repo data used for cross-checks.

## Hardware shape

- **3x Supermicro SYS-6028TR-HTR** chassis (2U, 4 blades each; model confirmed as 6028), **10 blades** in total. Three chassis hold 12 slots; the other 2 blades are physically pulled because the lab power breaker limits the load and the pulled blades preserve headroom. This is a lab limit only, not a design limit.
- Per blade: **2x Intel Xeon E5-2650 v4** (12 cores each, 24 cores total), **64 GiB RAM**.
- Per blade: **1x Mellanox ConnectX-5 100 Gb/s** port (EDR InfiniBand), unlocked for both IPoIB and Ethernet mode.
- Switch: **Mellanox SB7790**, **InfiniBand only**. Ethernet mode on the card is therefore unusable in the cluster (Ethernet is only the separate management network).
- Per blade: at most **3 SATA3 drives**. Drive layout (owner):

| Node type | Drive 1 | Drive 2 | Drive 3 |
|---|---|---|---|
| All blades | SSD, boot/OS | | |
| Head (2) | SSD, boot | SSD, cache + metadata (MDT) for the pool | unused |
| Compute (8) | SSD, boot | pool drive | pool drive |

  The two pool drives per compute blade form the shared pool. The owner describes them as **HDDs**. The repo's Lustre deployment uses **Samsung MZ7TY256 SATA SSDs** (16 x 238.5 GB) for the OSTs, and the earlier Ceph and BeeGFS tests ran on both "16x HDD" and "16x SSD" sets. So drive type is a variable: confirm which drives are in the pool in the final baseline and label every benchmark with its drive type (see open questions).

Cross-check against repo data (UJEP-LAB `CLAUDE.md`, `hosts.ini`):
- Repo names the chassis **SYS-6028TR-HTR**, same model. It describes only one 2U chassis with 4 blades, but 10 nodes need 3 chassis, so that repo line is incomplete.
- Roles used so far: 2 heads (`Rocky-Head-1/2`, 192.168.1.251-252, IB 10.0.0.251-252) + 8 compute (`Rocky-Compute-1..8`, 192.168.1.101-108, IB 10.0.0.1-8) = 10 blades. Matches the 10-blade total.
- Pool drives in the repo's Lustre runs: Samsung MZ7TY256 SSDs, 2 per compute node = 16 drives (16 OSTs, 3.7 TB). Heads carry 2x 128 GB SSDs: one boot, one MDT (matches the owner layout; the MGS is a loop file on the boot disk, see note 09).
- Networks: management Ethernet 192.168.1.0/24, IPoIB 10.0.0.0/24, IPMI 192.168.50.0/24.

## Constraints

1. Only 3 SATA3 drives per blade, so a node has 2 usable data drives at most.
2. One network port per blade, InfiniBand only. No separate storage and VM networks on different fabrics. Everything (storage, VM migration, cluster traffic) shares the one IB port; management goes over Ethernet on a separate network.
3. No Ethernet switch at 100 Gb/s, so RoCE/Ethernet-based solutions are out.
4. Only RHEL-family OS with NVIDIA OFED/DOCA drivers reaches line rate (baseline note 00a, tests 06 and 10).
5. Old CPUs (Broadwell, 2016) and 64 GiB per blade: no room for heavy per-node software stacks (this is the root of the Ceph overhead problem, note 03).

## Scope of this thesis

This thesis is groundwork. The lab (10 blades, 3 chassis, breaker-limited) is a test bed. In a real deployment there is no such restriction, so **chassis and blade count are a deployment decision** and all results here must be read as per-blade figures that scale with node count (16 data drives in the lab = 8 compute blades x 2). Requirements below are written so they hold for any blade count.

## Goal

Build a **storage pool over InfiniBand from the 2 extra drives in each blade** that is:
- **stable** (survives reboots and cold starts without manual repair; tolerates node loss),
- **limited only by SATA3**, not by the network. IB is not the bottleneck by design.

## Derived numbers (what "limited by SATA3" means)

- Figures below assume **SSD** pool drives (as in the repo runs). For HDDs the drive, not SATA3, is the limit.
- SATA3 link: 6 Gb/s, about 600 MB/s usable at best per drive.
- Measured bare SSD (fio, 2026-03-26, note 08): ~250 MB/s write, ~530 MB/s read per SSD (per-node values in `historical_comparison.csv`).
- Theoretical pool ceiling with 16 data drives (lab; scales linearly with blade count): about 4 GB/s write and 8.5 GB/s read aggregate (16 x measured), or about 9.6 GB/s (16 x 600 MB/s) at the SATA3 limit.
- IB EDR: 100 Gb/s, about 12.5 GB/s per port raw. Per blade the drives (2 x ~530 MB/s = ~1.06 GB/s read) use under 10% of the port, so the network has large headroom. A file server head that aggregates everything through one port (NFS/iSCSI design, note 05) would be capped near one port (about 12.5 GB/s raw, about 10.6 GiB/s measured via `ib_read_bw`), and is a single point of failure.
- Redundancy costs capacity and speed: 2-way mirroring halves usable space (3.7 TB raw, 1.85 TB usable) and cut writes about 17-20%.

## Requirements to build on

| ID | Requirement | Source |
|---|---|---|
| R1 | Use the 2 data drives of every compute blade (16 in the lab, N x 2 in deployment) as one shared pool | owner |
| R2 | Transport over InfiniBand, ideally native RDMA (not just IPoIB) | owner, notes 06/07 |
| R3 | Throughput close to aggregate SATA3 drive speed; network must not limit | owner |
| R4 | Stable: automatic recovery after reboot and full cold boot | owner, note 09 |
| R5 | Redundancy against loss of a blade (no RAID0-only design) | notes 04, 07 |
| R6 | Fit 64 GiB RAM and Broadwell CPUs with room left for VMs | hardware |
| R7 | Work on RHEL-family OS with NVIDIA drivers | note 00a |
| R8 | Serve as shared datastore for the VM layer (OpenNebula, live migration) | notes 10, 09 |
| R9 | Reproducible deployment by Ansible from bare install | notes 05, 09 |
| R10 | Managed over a separate Ethernet network (management, IPMI) | topology |

## How the candidates score (summary of notes 03-09)

| Candidate | R2 RDMA | R3 speed | R4 stable | R5 redundancy | Verdict |
|---|---|---|---|---|---|
| Ceph | no (TCP) | poor (0.4-1 GB/s) | yes | yes | fails R3 |
| BeeGFS community | yes | good (4.3 / 9.4 GiB/s) | yes | no | fails R5 |
| NFS + Pacemaker + iSCSI | no | single-head cap | no | RAID6 on head | fails R4 |
| GlusterFS | no (removed) | mid (1 / 4.1 GB/s) | yes | yes | fails R2 |
| Lustre 2.17 + FLR | yes (BTF workaround) | best (2.6 / 12.2 GB/s tuned) | yes after `lustre-startup.service` | FLR | selected |

## Open questions

- **Pool drive type**: owner says compute pool drives are HDDs; repo Lustre runs and the bare-drive baseline (250 / 530 MB/s) are SSDs. Which is the reference configuration? HDD numbers differ a lot (Ceph 16x HDD: 211 MB/s write, 619 MB/s read aggregate; BeeGFS 16x HDD: 2.80 GiB/s write) and the SATA3 ceiling only applies to SSDs, since a spinning HDD is limited by its own ~150-250 MB/s, not by SATA3.
- Head cache role: the head "cache" SSD has no cache function in the current Lustre setup (MDT only). Is a cache tier planned, and with what software?
- Is the tuned-Lustre 12.2 GB/s read (above the SATA ceiling) mostly client cache? To claim "limited only by SATA3", re-measure with cache bypass (O_DIRECT, dropped caches, working set larger than RAM).
