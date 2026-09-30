# Results table (from the paper)

| OS | Driver | Method | IB speed | IPoIB speed |
|---|---|---|---|---|
| Proxmox 8.3.x | MLNX_OFED | - | - | - |
| Proxmox 8.3.x | MLNX_EN | - | - | - |
| Proxmox 8.3.x | OSS RDMA + IB | IPoIB | - | 20 Gbps |
| Proxmox 8.2.1 | MLNX_OFED | IB | - | - |
| Proxmox 8.2.1 | MLNX_EN | Eth | - | - |
| Proxmox 8.2.1 | OSS RDMA + IB | IPoIB | - | 20 Gbps |
| **Rocky 9.5** | MLNX_OFED | IB | 92 Gbps | 82 Gbps |
| FreeBSD 14.2 | OSS IB | IPoIB | - | 5 Gbps |
| Debian 12.9 | DOCA-ALL | IB | - | - |
| CentOS Stream 10 | DOCA_OFED | IPoIB | 91 Gbps | 89 Gbps |
| **CentOS Stream 9** | DOCA_OFED | IPoIB | 90 Gbps | 60 Gbps |

Paper typos: Proxmox "8.2.1" vs 8.2.2 in text; "82 Gbp". Windows, Harvester, CentOS Eth-mode (40 Gbps) are not in the table.
