# Test 13: Windows 10 + ConnectX-5 drivers

Result: **Fail**

Source: owner's account, 2026-10-01. Not in the Overleaf paper (`hledani.tex`), so it was not written up at the time. Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Windows 10 installed on a test machine. No ConnectX-5 driver was available for the desktop edition. The Windows Server drivers (MLNX_WinOF2, see test 11) were tried instead and crashed the OS, so the attempt was abandoned.

## Finding

No usable desktop driver; the server driver is not safe to force onto a desktop edition. Same dead end as test 11.

## Open details to fill in

Exact driver version tried, whether it was a BSOD at install or at load, and the error text. Not recorded.
