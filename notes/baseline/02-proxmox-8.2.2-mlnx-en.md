# Test 02: Proxmox 8.2.2 + MLNX-EN

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Reinstalled Proxmox 8.2.2 (Debian 12.5). Drivers installed and card firmware was updated without errors. Card still did not show as a network device. Documentation showed the card can be switched to Ethernet mode by software; it then appeared.

## Finding

Switch has no Ethernet mode, so InfiniBand and IPoIB are required. Kernel has no InfiniBand drivers and no IPoIB support.

## Next step

Need IB stack. See test 03.

## Note

See also `../00a` side doc: mlxconfig LINK_TYPE_P1=2 switches to Ethernet.

## References

[IPoIB], [InfiniBand] (see `dump/Mellanox_SB7790/references.bib`)
