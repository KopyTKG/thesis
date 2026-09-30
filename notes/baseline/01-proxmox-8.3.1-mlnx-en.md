# Test 01: Proxmox 8.3.1 + MLNX-EN

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Proxmox 8.3.1 (Debian 12.9), driver MLNX-EN, following an AI-provided guide.

## Finding

MLNX-EN cannot be installed on Debian 12.9.

## Next step

Downgrade to Proxmox 8.2.2 (Debian 12.5).

## References

[EN] Nvidia MLNX_EN drivers (see `dump/Mellanox_SB7790/references.bib`)
