# 05 - Dec 2025: Ansible rewrite and NFS + Pacemaker + TargetCLI

Period: 2025-12-04 to 2025-12-17.

## Ansible base (12-04 to 12-10)

- 12-04: "base for ansible": `ansible/` with inventory, `ansible.cfg`, first playbook for basic server install. Documented in `shared/ansible_base.md` (hosts.ini with `ib_ip` derived from the last octet, ed25519 key, vault for secrets, connectivity test).
- 12-10: data adjusted "for lab use" (real hosts).

## NFS design (12-11)

One big commit (14 files, 1031 lines). Seven ordered playbooks:

1. core install (chrony, OpenSM, IB)
2. compute storage: wipe disks, export as **TargetCLI (iSCSI) LUNs**
3. controller aggregation, NFS server with Pacemaker on Head-1
4. software **RAID6** over the exported LUNs
5. Pacemaker resources for NFS + TargetCLI
6. Head-2 joins HA
7. client NFS mounts

Plus `benchmark.yml`, `heavy_benchmark.yml`, `export_ssd.yml`, `rescue_cluster_config.yml`.

## Failure (12-17)

Commit "Sadge - NFS is not the way": repo restructured into per-filesystem directories (`nfs/`, `docs/`), `docs/NFS_PCS_TargetCLI.md` created. Reason (README): the head server "decides to nuke itself after every reboot". Fixes for include paths followed.

Benchmark numbers exist (1.2-1.75 GB/s write, 1.8-3.3 GB/s read per node) but are marked **INVALID** in the CSV: results were RAM-cached despite `direct=1`.

## Verdict

Rejected on stability. Fast to build, but HA through Pacemaker + iSCSI RAID6 on the head is a single fragile point.
