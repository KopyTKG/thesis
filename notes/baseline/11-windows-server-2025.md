# Test 11: Windows Server 2025 + MLNX_WinOF2

Result: **Fail**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

OS installed on both test machines without issue. After MLNX_WinOF2: NIC detected as ConnectX-5 but service `MellanoxNDProvider` inactive; `mlnxnd.sys` missing ("Cannot start service MellanoxNDProvider... The system cannot find the file specified"). No `ib_send_bw.exe`, `mlxconfig.exe`, `flint.exe` in base package. WinMFT 4.22.1.406 installed but no `bin` folder, MST service config missing. Manual service registration failed. Card was switched to IB mode via `mlxconfig` (after `mst status`). WSL + OFED failed (not supported).

## Finding

Could not run IB benchmarks: missing binaries, incomplete packages, service init errors.

## Next step

Recommended: Linux with full OFED, or NVIDIA UFM bootable LiveCD.

## References

[OFED] (see `dump/Mellanox_SB7790/references.bib`)
