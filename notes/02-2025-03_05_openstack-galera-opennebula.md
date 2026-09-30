# 02 - Mar to May 2025: OpenStack, Ceph/Galera, OpenNebula Go installer

Period: 2025-03-18 to 2025-05-18.

## OpenStack attempt (2025-03-18 to 03-31)

- 03-18: `tweaks/` added (nova.conf, placement-api Apache config, nova permission fix, later dashboard config), `controller.sh`, `compute.sh`. Commit message 03-19: "adding more configs cuz docs are bad".
- 03-31: controller + compute setup scripts. Then a month of silence.
- Later summary in `opennebula/README.md`: "OpenStack tested, never reached a working state (build it yourself)".

## Cleanup and pivot (2025-04-29 to 04-30)

- 04-29 "openstack cleanup": 11 files changed, 220 lines removed (nova, placement, dashboard tweaks deleted). `openstack.sh` renamed to `chrony.sh`.
- Same day: Galera cluster setup (MariaDB repos, `galera-4`), hosts config, and the first Ceph script (`ceph.sh`, Ceph ports). 04-30 "ceph added", "full run" script, second controller removed.

## OpenNebula (2025-05-02 to 05-18)

- 05-02 `nebula.sh`, more `/etc/hosts`, SSH fixes ("wrong ip ups").
- 05-09 Galera dropped for standard MariaDB ("removing galera and adding standard maria"); `nebula-c.sh` client script, VNC extras, `sql.sh`.
- 05-17 and 05-18: a **Go program** (`nebula_cluster` binary, packages `dnf`, `firewalld`, `mariadb`, `nebula`, `password`, `perms`, `service`, `log`) automates the OpenNebula install. Binary grew 2.6 MB to 7.9 MB across three commits.
- The Go sources were removed on 2025-11-06 ("rm all golang files", 615 lines) when the work moved to Ansible.

## Then a pause

No commits from 2025-05-18 to 2025-10-30 (five months). Likely summer break and thesis assignment cycle; confirm with Overleaf history.

## Takeaways

- Galera appears here first, was dropped for plain MariaDB, and returns in May 2026 as the OpenNebula HA database (note 10).
- The OpenNebula plan predates every filesystem experiment. Storage was chosen to serve it, not the other way round.
