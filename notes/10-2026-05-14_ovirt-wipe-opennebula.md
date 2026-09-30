# 10 - 2026-05-14: oVirt rejected, K8s wiped, OpenNebula started

Sources: `docs/oVirt.md`, `opennebula/README.md`, commits `01c8b36` to `edf770a` (current HEAD).

## oVirt (NO-GO)

oVirt 4.5.7 (2026-01-13) has about one release per year, post-RHV EOL. Two blockers:
1. VDSM writes `xleases` in 256512 B blocks, which fails 4 KiB `O_DIRECT` alignment on Lustre (open upstream thread, no fix, no known success).
2. Alternative POSIX domain GlusterFS has no RDMA any more; NFS has no native RDMA.

## Kubernetes retired

`stage18_wipe_for_opennebula.yml` removes K8s, keepalived, HAProxy, runtimes and state; keeps Lustre, `lustre-startup.service`, base cluster and the lab CA (copied to `/etc/pki/ujep-lab/` for Sunstone HTTPS). Git tag `pre-opennebula-wipe`. Stated reason: cloud-platform model fits a school cluster better than container-platform.

Also committed: `Mellanox_SB7790.pdf`, the group-phase paper documenting a 12-attempt OS/driver search (Proxmox, FreeBSD, Windows, Harvester, Debian, Rocky 9.5, CentOS Stream 9/10). Conclusion: only RHEL-family plus NVIDIA-blessed drivers reach 100 Gb/s on the IB-only SB7790.

## OpenNebula 6.10, HA-first (stages 7-10)

- Scaffold copies Lustre stages 0-6 and cold-boot fix, then: 7 prereqs (EPEL, CRB, repo, SELinux permissive, firewall), 8 DB, 9 DB VIP, 10 frontend on Head-1.
- **DB pivot**: first PostgreSQL 16 + Patroni + 3-node etcd; OpenNebula 6.10 supports only SQLite/MySQL (`DB BACKEND must be sqlite or mysql`). Replaced by **MariaDB Galera** 3 nodes (Head-1, Head-2, Compute-1). HAProxy single-writer + keepalived VIP `192.168.1.249:3306`. `cleanup_pg_etcd_layer.yml` rolls back.
- Fixes: `ib_ip` derived wrongly as 10.0.0.101 (actual 10.0.0.1), explicit per host; etcdctl PATH symlink; Postgres/HAProxy port bind conflict (moot after pivot); FireEdge port is 2616, not 2474 (OneFlow).
- Verified: `wsrep_cluster_size=3`, `Primary`, VIP reaches Head-1, 39-table schema, `oneuser list` works, Sunstone at `:9869`.

## State at end of data

Lustre baseline + OpenNebula frontend on Head-1. Stage 11+ not written: oned Raft HA on Head-2, KVM hosts on compute, Lustre datastore (`DS_MAD=fs`, `TM_MAD=shared`, live migration for free), TLS, test VM, users/groups.
