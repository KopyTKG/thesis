# 00a - Before the repo: Mellanox SB7790 / ConnectX-5 OS and driver search

Period: February to early March 2025 (paper dated "Vypracováno 5. března 2025", 4 days before the first UJEP-LAB commit on 2025-03-09).
Source: Overleaf export in `dump/` (`Mellanox_SB7790/` LaTeX project + `CX555A-Ethetnet.tex`). The compiled version is `Mellanox_SB7790.pdf`, committed to UJEP-LAB on 2026-05-14 as evidence for the workload-layer rejection chain.

Title: "Konfigurace Mellanox ConnectX-5 v Proxmox virtualizaci". Authors: Bao Kieu Quang, Jakub Petrášek, Martin Kopecký (group phase, three people). Language: Czech.

## Problem

Get 100 Gb/s working between ConnectX-5 cards through a Mellanox SB7790, a switch that speaks **InfiniBand only** (no Ethernet mode). Linux kernels have no ready IPoIB/IB setup out of the box. Original target platform: Proxmox.

## 12 attempts

| # | Platform + driver | Result | Finding |
|---|---|---|---|
| 1 | Proxmox 8.3.1 (Debian 12.9) + MLNX-EN | fail | MLNX-EN cannot install on Debian 12.9, downgrade |
| 2 | Proxmox 8.2.2 (Debian 12.5) + MLNX-EN | fail | card only appears after switching to Ethernet mode, but switch has no Ethernet, so IB is needed |
| 3 | Proxmox 8.2.2 + MLNX-EN + rdma-core | fail | MLNX-EN is an Ethernet driver, not IB; reinstall |
| 4 | Proxmox 8.2.2 + MLNX-OFED | fail | installer demands removal of `proxmox-ve` |
| 5 | Proxmox 8.2.2 + OSS IB (forum guide) | partial | works via `opensm`, `ib_umad`, `ib_ipoib`, static `ibs1`; only **20 Gbps** IPoIB. Proxmox VE + Ceph reached only **2-2.5 Gbps** (TCP/IP over IPoIB, neither supports IB natively) |
| 6 | **Rocky 9.5 + DOCA_OFED** | **success** | `ib_read_bw` ~10.6 GiB/s, **90-92 Gbps** IB, ~82 Gbps iperf |
| 7 | FreeBSD 14.2 + OSS IB | fail | ~5 Gbps IPoIB, community-only OFED |
| 8 | Debian 12.9 + DOCA-ALL | fail | interface does not appear, no IPoIB mode |
| 9 | CentOS 10 + Ethernet mode | fail | 40 Gbps direct link; no QSFP28 Ethernet switch available |
| 10 | **CentOS Stream 10 + MLNX_OFED (last LTS)** | **success** | ~89 Gbps with iperf3; OS installed without IB, OFED added after |
| 11 | Windows Server 2025 + MLNX_WinOF2 | fail | `MellanoxNDProvider` missing `mlnxnd.sys`, incomplete WinMFT, no bench tools, WSL cannot run OFED |
| 12 | Harvester (SUSE, immutable) | fail | IB config wiped on reboot (read-only OS), hard to find repos, speed untested |

Results table in the paper (IB / IPoIB):
- Rocky 9.5 + MLNX_OFED: 92 / 82 Gbps (bold, chosen)
- CentOS Stream 10 + DOCA_OFED: 91 / 89 Gbps
- CentOS Stream 9 + DOCA_OFED: 90 / 60 Gbps (bold, chosen)
- Proxmox variants: 20 Gbps IPoIB at best; FreeBSD 5 Gbps; Debian DOCA none.

## Decision

Final platform for **OpenNebula**: **CentOS Stream 9** and **Rocky Linux 9.5**, because of IPoIB speed and native IB/IPoIB support. Only RHEL-family plus NVIDIA drivers reach line rate.

Inconsistency inside the paper: attempt 6 says "Rocky 9.5 + DOCA_OFED", the table says "Rocky 9.5 + MLNX_OFED", and attempt 10 says "CentOS 10 + MLNX_OFED" while the table says DOCA_OFED. Check which is right before citing. The repo shows DOCA-OFED chosen on 2025-03-11 (note 01).

## Side document: CX555A-Ethetnet.tex (March 2025)

Short how-to to switch the card to Ethernet: find PCIe address with `lspci`, install MFT, `mlxconfig -d XX:XX.X set LINK_TYPE_P1=2`, reboot. States Proxmox cannot do the switch itself. This is the origin of `tools/eth_mode.sh` (2025-03-13).

## Chapter "Instalace OpenNebula na RockyLinux 9.5" (nebula.tex, unfinished)

- Network: net A `192.168.1.0/24` Ethernet (uplink, IPMI), net B `10.0.0.0/24` isolated IPoIB (node-to-node, clustering). Diagram in `assets/diagram.png`. Controller's IB port is named `ibp1s0`, compute nodes `ibs1`.
- Semi-automatic install via `tools/full.sh` from UJEP-LAB.
- Steps written: `nmcli` static IP, root SSH by ed25519 key only, `/etc/hosts` (node1..8 on 10.0.0.x, Eth-node1..8 on 192.168.1.201-208), chrony with CESNET servers `tik/tak.cesnet.cz`, MariaDB config, OpenNebula 6.10 repo + packages (`opennebula`, `fireedge`, `gate`, `flow`, `provision`), firewall port 2616, Ceph via `cephadm` (controller bootstrap on Ethernet, OSDs on IPoIB hosts).
- Stub sections: RabbitMQ, Memcached, and OpenStack-style TODOs (nova libvirt driver, placement httpd, nova perms). These match the OpenStack attempt in repo note 02: the guide was started with OpenStack services in mind and then re-aimed at OpenNebula.
- Note: at this point the node numbering and the head/compute split of later notes did not exist yet (`controller` + 8 nodes; later 2 heads + 8 computes).

> Security: `nebula.tex` contains a table of lab-draft passwords, now kept in `baseline/credentials-lab-draft.md` (thesis baseline). Rotate before deployment; do not publish the LaTeX, PDF or that file.

## Connections to later notes

- Attempt 5 (Ceph over IPoIB only 2-2.5 Gbps) foreshadows Ceph rejection in note 03.
- Attempts 6/10 justify RHEL-family choice used everywhere after (notes 01 to 10).
- Ethernet-mode dead end explains why all later storage tests are IPoIB or native RDMA, never Ethernet.
- Repo's `opennebula/README.md` cites this paper as the "12-OS / driver matrix".
