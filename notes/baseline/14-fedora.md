# Test 14: Fedora + ConnectX-5 (control run)

Result: **Success (about the same as CentOS / RHEL)**

Source: owner's account, 2026-10-01. Not in the Overleaf paper. Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## Why it was run

Control test, done personally to check that the Red Hat family core (not the specific distribution) is what allows near line speed. Not a full test series.

## What was done

Fedora installed; `iperf` run over the IB link. Result was about the same as CentOS Stream and Rocky (tests 06 and 10: 89-91 Gbps IPoIB/IB there).

## Finding

Supports the idea that the Red Hat family kernel is what delivers line speed with the in-kernel IB drivers, and Fedora behaves the same way.

## Open details to fill in

Fedora version, driver package used (DOCA-OFED vs inbox), and the actual `iperf` number. Only "about the same" was recorded.
