# Test 03: Proxmox 8.2.2 + MLNX-EN + rdma-core

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Installed open-source RDMA userland per Debian wiki:
```
apt install rdma-core
apt install libibverbs1 librdmacm1 libibmad5 libibumad3 librdmacm1 ibverbs-providers rdmacm-utils infiniband-diags libfabric1 ibverbs-utils
```
Card still not recognized.

## Finding

MLNX-EN is an Ethernet driver, not InfiniBand. Had to reinstall the system.

## Next step

Try MLNX-OFED (test 04).

## References

[guideDeb] Debian wiki RDMA (see `dump/Mellanox_SB7790/references.bib`)
