# 06 - Jan 2026: GlusterFS and first Lustre (Rocky 8.10)

Period: 2026-01-05 to 2026-01-08.

## GlusterFS (01-05, 01-06)

- Playbooks stage1 to stage4, `new-stage2.yml`, common benchmark/startup/shutdown/reboot/update, `gluster-uninstall.yml`, diagnostics.
- Only **IPoIB** possible: RDMA transport removed upstream in current releases. README banner: "Due to RDMA removal in previous versions, GlusterFS is not viable".
- fio results (8 nodes): write 71-226 MB/s per node (aggregate 1182 MB/s), read ~500-520 MB/s per node (aggregate 4109 MB/s). Pairs of nodes at ~72 MB/s vs ~222 MB/s suggest a replica/brick layout imbalance.
- Verdict: rejected, RDMA.

## Lustre on Rocky 8.10 with Lustre 2.15.4 (01-07 to 01-08)

- 01-07 commit "adding lustre and claude": first `CLAUDE.md`, `lustre/` project, stages 0-2, benchmark and diagnostics playbooks. Session log begins in `lustre/log.md`. Problems solved: repo cleanup with shell module, missing devel packages, `lustre-client` vs `lustre-client-dkms` conflict.
- 01-08: stages 3-6. Design: MGS on Head-1 and MDTs on both heads as **loop devices** (heads had no spare SSD), OSTs on compute Samsung SSDs (2 per node, 16 total). Compute-4 was unreachable, Compute-8 wedged and had to be reintegrated (OST index conflicts, re-formatted as OST18-19).
- TCP performance: **1.5 GB/s write, 3.2 GB/s read** aggregate.
- **Discovery**: Lustre 2.15.4 server kernel (`4.18.0-513.9.1.el8_lustre`, RHEL 8.5 base) has **no InfiniBand drivers**. Stock kernel has IB but no ldiskfs. Copying modules fails on kABI. Only Compute-5..8 showed partial RDMA. So the whole 100 Gb/s fabric was unused. Idea: Lustre 2.15.8 supports el8.10.
- Evening: a cleanup playbook (`cleanup_and_revert.yml`) set the stock kernel as default while `fstab` still had Lustre mounts. **All 8 compute nodes dropped to emergency mode**. Commit "FCKED UP" (kernel.log with 3665 lines, log.md +648).
- Lesson recorded: always clean `fstab` before changing kernels when mounts need kernel-specific modules.

## Gap

01-08 to 01-13: recovery and decision to reinstall (see note 07).
