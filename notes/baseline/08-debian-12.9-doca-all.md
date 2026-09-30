# Test 08: Debian 12.9 + DOCA-ALL

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Installed DOCA drivers on Debian 12.9. Network interface did not appear; IPoIB mode not usable with these drivers.

## Finding

DOCA drivers on Debian unusable for this purpose.

## Next step

Rejected.

## References

[DOCA] (see `dump/Mellanox_SB7790/references.bib`)
