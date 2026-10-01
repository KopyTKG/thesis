# Baseline: Mellanox SB7790 / ConnectX-5 attempts (one file per test)

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

| # | Test | Result |
|---|---|---|
| 01 | [Proxmox 8.3.1 + MLNX-EN](01-proxmox-8.3.1-mlnx-en.md) | Fail |
| 02 | [Proxmox 8.2.2 + MLNX-EN](02-proxmox-8.2.2-mlnx-en.md) | Fail |
| 03 | [Proxmox 8.2.2 + MLNX-EN + rdma-core](03-proxmox-8.2.2-mlnx-en-rdma-core.md) | Fail |
| 04 | [Proxmox 8.2.2 + MLNX-OFED](04-proxmox-8.2.2-mlnx-ofed.md) | Fail |
| 05 | [Proxmox 8.2.2 + open-source IB (IPoIB)](05-proxmox-8.2.2-oss-ib.md) | Partial |
| 06 | [Rocky 9.5 + DOCA_OFED + IB](06-rocky-9.5-doca-ofed.md) | SUCCESS |
| 07 | [FreeBSD 14.2 + OFED (community)](07-freebsd-14.2.md) | Fail |
| 08 | [Debian 12.9 + DOCA-ALL](08-debian-12.9-doca-all.md) | Fail |
| 09 | [RedHat family + CentOS 10 + Ethernet mode](09-centos-10-eth-mode.md) | Fail |
| 10 | [CentOS Stream 10 + MLNX_OFED (last LTS)](10-centos-10-mlnx-ofed.md) | SUCCESS |
| 11 | [Windows Server 2025 + MLNX_WinOF2](11-windows-server-2025.md) | Fail |
| 12 | [Harvester (SUSE Linux)](12-harvester-suse.md) | Fail |
| 13 | [Windows 10 + server drivers](13-windows-10.md) | Fail (not in paper) |
| 14 | [Fedora (control run)](14-fedora.md) | Success, not in paper |
| 15 | [NetBSD](15-netbsd.md) | Fail (not in paper) |

Other files:
- [results-table](results-table.md)
- [decision](decision.md)
- [ethernet-mode-howto](ethernet-mode-howto.md)
- [network-topology-and-setup](network-topology-and-setup.md)
- [intro-ib-vs-ethernet](intro-ib-vs-ethernet.md)
- [credentials-lab-draft](credentials-lab-draft.md)
