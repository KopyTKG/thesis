# 01 - March 2025: Mellanox drivers, virtualization, Pacemaker

Period: 2025-03-09 to 2025-03-14 (about 40 commits, all small).

Preceded by the Overleaf paper in note 00a (12 OS/driver attempts, Rocky 9.5 chosen).

## What happened

- **2025-03-09**: repo created as "Lab setup pro 100Gbps clustering" (Czech: lab setup for 100 Gbps clustering). First scripts under `tools/`: Mellanox firmware update, driver install, autoload and cleaner scripts.
- **2025-03-10**: README turns into a curl-pipe-bash runbook (branch `Live`): 1) firmware, 2) driver, 3) static IP on the `ibs1` link (`ipoib_static.sh 10.0.0.x`). Lots of fix-up commits (`su` replaced by `sudo bash`, paths, input errors). Firmware update skipped during driver install.
- **2025-03-11**: `virt_install.sh` added (qemu-kvm, libvirt, virt-manager, cockpit, pacemaker, pcs, corosync, fence agents). "Cluster guide" added to README: set `hacluster` password on all nodes, `/etc/hosts` with 10.0.0.1-4 as nodeA-D, `pcs host auth`, `pcs cluster setup`. `clustering.md` adds the CentOS Stream 10 HighAvailability repo. iperf3 removed.
- **2025-03-11**: **switch from MLNX_OFED to DOCA-OFED** ("Migrating to doca ofed", `doca_ofed_install.sh`). Reason is implied by the vendor direction; commit message gives none.
- **2025-03-13**: `eth_mode.sh` added: script to switch a ConnectX port into Ethernet mode by PCIe address (tested for Debian/Ubuntu and RHEL-family branches).
- **2025-03-14**: OpenSM added to the DOCA script (subnet manager needed because the SB7790 is an unmanaged IB-only switch).

## Takeaways

- From day one the design centers on IB with IPoIB static addresses in `10.0.0.0/24`.
- The virtualization plan at this point is libvirt + Pacemaker (manual HA), not a cloud platform.
- Deliverables of this phase survive as `tools/*.sh` in UJEP-LAB.
