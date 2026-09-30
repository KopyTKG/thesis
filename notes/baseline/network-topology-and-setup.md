# Network topology and setup (nebula.tex, unfinished)

Two separate networks:
- **A**: 192.168.1.0/24, Ethernet. Uplink to internet and IPMI.
- **B**: 10.0.0.0/24, InfiniBand (IPoIB). Isolated, node-to-node and clustering traffic.

Diagram: `dump/Mellanox_SB7790/assets/diagram.png`. Controller IB port `ibp1s0`, others `ibs1`.

Setup steps in the draft:
- Assumes clean Rocky 9.5 server install; BMC, BIOS/UEFI, NIC firmware already updated.
- Semi-automatic install: `curl ... UJEP-LAB/Live/tools/full.sh | sudo bash` (drivers, MariaDB, chrony, OpenNebula).
- `nmcli con mod ibs1 ipv4.addresses 10.0.0.1/23 ipv4.method manual`, autoconnect yes, `nmcli con up ibs1` (screenshots nmtui-00..16 in assets).
- SSH: ed25519 key, root key-only login, distribute `authorized_keys` manually.
- `/etc/hosts`: node1..8 on 10.0.0.1-8, controller, Eth-node1..8 on 192.168.1.201-208. Verify with ping.
- Chrony: CESNET servers `tik.cesnet.cz`, `tak.cesnet.cz` with iburst; firewall service ntp.
- MariaDB: `bind-address = 0.0.0.0`, innodb, max_connections 4096, utf8.
- OpenNebula 6.10 repo (needs CRB/powertools, EPEL), packages opennebula, fireedge, gate, flow, provision; firewall port 2616.
- Ceph via cephadm (reef): bootstrap on Ethernet IP, add hosts by IPoIB address, `ceph orch apply osd --all-available-devices`.
- Empty stubs: RabbitMQ, Memcached; OpenStack TODOs (nova libvirt driver, placement httpd, nova perms).

Password table: see [credentials-lab-draft](credentials-lab-draft.md).
