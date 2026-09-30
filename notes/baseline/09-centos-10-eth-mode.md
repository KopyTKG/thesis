# Test 09: RedHat family + CentOS 10 + Ethernet mode

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Card switched to Ethernet mode, direct back-to-back link.

## Finding

**40 Gbps** direct. No QSFP28 switch with Ethernet mode available, so unusable in the cluster.

## Next step

Rejected; IB path only.
