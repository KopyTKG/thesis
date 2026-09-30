# Test 07: FreeBSD 14.2 + OFED (community)

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

FreeBSD has no native Nvidia OFED/EN drivers; everything is community. Used guide from GitHub (freeBSD-MLNX-OFED script).

## Finding

Synthetic tests ~**5 Gbps**. IPoIB implementation worse than on Linux.

## Next step

Rejected.

## References

[OFEDBSD] (see `dump/Mellanox_SB7790/references.bib`)
