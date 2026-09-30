# Ethernet mode switch (CX555A-Ethetnet.tex, March 2025)

Proxmox cannot switch the card mode itself. Steps:

1. Find PCIe address: `lspci | grep -i mellanox` gives e.g. `02:00.0 Infiniband controller: Mellanox Technologies MT27800 Family [ConnectX-5]`. Note `XX:XX.X`.
2. Install MFT (MSTFLINT): `apt-get install gcc make dkms linux-headers-$(uname -r)`, download `mft-4.30.1-113-x86_64-deb.tgz`, extract, run `install.sh`.
3. `mlxconfig -d XX:XX.X set LINK_TYPE_P1=2` (IB(1) to ETH(2)), confirm with `y`.
4. Reboot, run `ip add`; a new Ethernet port should appear.

Not usable in the cluster: SB7790 is IB-only. Repo script: `tools/eth_mode.sh` (2025-03-13).
