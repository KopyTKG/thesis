# Test 05: Proxmox 8.2.2 + open-source IB (IPoIB)

Result: **Partial**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Followed forum post by user Alpha75429. Only open-source drivers:
```
apt install -y infiniband-diags opensm ibutils rdma-core rdmacm-utils
modprobe ib_umad
modprobe ib_ipoib
ip link show
```
Static address in `/etc/network/interfaces`:
```
auto ibs1
iface ibs1 inet static
    address 10.0.0.1
    netmask 255.255.255.0
    mtu 2044
```
`systemctl restart networking`; verify with `iperf3 -s` on nodeA and `iperf3 -c 10.0.0.2` on nodeB.

## Finding

Card detected, IPoIB works but only **20 Gbps** synthetic. Proxmox VE + Ceph reached only **2-2.5 Gbps**: both run over TCP/IP, very limited on IPoIB; neither Ceph nor Proxmox VE supports InfiniBand natively. IPoIB stays possible if MTU could reach ~65000 (connected mode).

## Next step

Move two systems to Rocky 9.5 to try MLNX-OFED.

## Note

Datagram-mode IPoIB MTU 2044 explains part of the limit.

## References

[guide] Proxmox forum thread (see `dump/Mellanox_SB7790/references.bib`)
