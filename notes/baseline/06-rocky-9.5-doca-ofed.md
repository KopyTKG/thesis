# Test 06: Rocky 9.5 + DOCA_OFED + IB

Result: **SUCCESS**

Source: `dump/Mellanox_SB7790/kapitoly/hledani.tex` (Overleaf paper, 2025-03-05). Hardware: ConnectX-5 100 Gb/s, Mellanox SB7790 (InfiniBand only).

## What was done

Installed Nvidia DOCA_OFED on Rocky 9.5. RDMA read test:
```
# ib_read_bw -d mlx5_0   (server side)
RDMA_Read BW Test, Device mlx5_0, Transport IB, Connection RC, MTU 4096
#bytes 65536  iterations 1000  BW peak 10629.15 MiB/s  BW average 10628.79 MiB/s  MsgRate 0.170 Mpps
```
Warning: CPU not PCIe relaxed-ordering compliant (suggests `--disable_pcie_relaxed`).

## Finding

**90-92 Gbps** synthetic over IB; **~82 Gbps** with iperf. Speed reachable only over InfiniBand.

## Next step

Chosen as platform base (with CentOS Stream 9).

## Note

Paper table lists this row as MLNX_OFED, text says DOCA_OFED: inconsistent.

## References

[DOCA], [InfiniBand] (see `dump/Mellanox_SB7790/references.bib`)
