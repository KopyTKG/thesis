# Test 15: NetBSD + ConnectX-5

Result: **Fail**

Source: owner's account, 2026-10-01. Not in the Overleaf paper. Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## Why it was tried

Suggested by a student who works in a datacenter: NetBSD is used as a base for networking appliances, so support for these cards was expected. Tried together with FreeBSD (test 07).

## What was done

NetBSD installed. The kernel driver attached and created a link, but with no network stack on top of it, so no usable interface or traffic. No NVIDIA/Mellanox driver exists for NetBSD, so there was nothing further to install. Result was as bad as or worse than most Linux distributions.

## Finding

NetBSD's driver brought the link up but exposed no usable IB/IP stack, and no vendor driver exists for it. This is not evidence that the card needs the vendor OFED/DOCA stack: on Linux the in-kernel IB drivers are enough (a RHEL-family kernel reaches near line speed with them; Proxmox and Debian reach only about 25 Gbps with the same drivers). The difference is the kernel, not an extra driver package. FreeBSD got about 5 Gbps over IPoIB (test 07).

## Open details to fill in

NetBSD version, driver name that attached, and the exact dmesg output.
