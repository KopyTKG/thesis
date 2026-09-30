# Intro: InfiniBand vs Ethernet (uvod.tex, hledani.tex)

Goal: get 100 Gbps ConnectX-5 working through the IB-only SB7790. Linux kernels lack IB drivers out of the box.

Differences claimed in the paper:
- Protocol: Ethernet uses TCP/IP layering; InfiniBand is low-level, built for throughput and low latency.
- Latency: IB microseconds, Ethernet typically milliseconds (overstated; modern Ethernet is far lower).
- Throughput: IB up to 400 Gb/s.
- Topology: IB allows direct node communication with RDMA.
- Use: Ethernet in enterprise networks; IB in HPC and data centres.

Reference: NVIDIA Introduction to InfiniBand white paper.
