
If tests come true then lustre is the best option to push 100Gb network with fully clustered FS on this hardware

> Clustered FS - there is no centralized storage pool because each node has limit on how many drive it can hold. Hence we cannot deploy easier options like JBOD and software RAID to then share



## Why not centralized storage
As per thesis requirements we cannot deploy anymore hardware then compute node. That create a breaking point for creating a single head node over a JBOD chassis, since that would require more space in rack and it would also require more power. With that the only option is to use remaining unused 2 SATA ports on each blade.

## Why full clustering
At the beginning of testing all options there were attempts to deploy "JBOD" style centralized storage with NFS, Pacemaker, RDADM and TargetCLI. But each reboot was nuking the whole setup. Every boot needed to be timed to ensure correct order which with older hardware like this was impossible.

That resulted in me trying to find option that would decentralized the managements layer and redundancy (RAID) onto whole cluster to mitigate single point of failer. That lead me to the path of HPC clustering and file systems like BeeGFS but as much as it was good it came with one issue and that was you need to paid for redundancy options. So from perfect option we got back to square one. After long time of searching i have discovered GlusterFS and Lustre.