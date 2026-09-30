# Test 04: Proxmox 8.2.2 + MLNX-OFED

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Switched to MLNX-OFED (RDMA mode). Installer errored: package `proxmox-ve` must be removed, and it is required for Proxmox to run.

## Finding

MLNX-OFED is not compatible with Proxmox. Would need clean Debian 12.5 converted to Proxmox manually.

## Next step

Try open-source stack only (test 05).

## References

[OFED], [RDMA] (see `dump/Mellanox_SB7790/references.bib`)
