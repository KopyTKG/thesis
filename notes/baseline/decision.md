# Decision

For the final OpenNebula deployment the paper chose **CentOS Stream 9** and **Rocky Linux 9.5**. Reason: IPoIB speed and native support for InfiniBand and IPoIB in the network stack.

Consequence for the rest of the thesis: RHEL-family OS only (later Rocky 9.7, briefly Rocky 10.0 and Rocky 8.10), NVIDIA OFED/DOCA drivers, IPoIB `10.0.0.0/24` for storage.
