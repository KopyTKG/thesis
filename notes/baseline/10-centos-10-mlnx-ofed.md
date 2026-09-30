# Test 10: CentOS Stream 10 + MLNX_OFED (last LTS)

Result: **SUCCESS**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

OS installed without InfiniBand support; IB added afterwards through Nvidia MLNX_OFED (old LTS build), OFED drivers only. Test with iperf3.

## Finding

~**89 Gbps** (near 100 Gbps). Old Nvidia drivers were the working ones.

## Next step

Confirms RHEL-family + OFED works. CentOS Stream 9 finally picked.

## Note

Table lists DOCA_OFED for CentOS 10 (91/89 Gbps IB/IPoIB): inconsistent with text.

## References

[OFED] (see `dump/Mellanox_SB7790/references.bib`)
