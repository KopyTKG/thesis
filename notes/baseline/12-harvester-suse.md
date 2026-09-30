# Test 12: Harvester (SUSE Linux)

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Install and drivers OK. Ping over InfiniBand to another system OK.

## Finding

Immutable/read-only system: needs GRUB debug mode to change; after reboot Harvester deletes the IB interface configuration. Hard to find repositories for further installs. IB speed never tested.

## Next step

Possible retry: install SUSE first, then Harvester on top; no guide found.
