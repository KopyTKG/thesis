# 07 - Jan 2026: Rocky 9.7, Lustre 2.17.0, BTF workaround, FLR

Period: 2026-01-13 to 2026-01-14. Sources: `lustre/ROCKY9_RDMA_BREAKTHROUGH.md`, `docs/Lustre.md`, commit `10bdf85`.

## Reinstall

All 10 nodes manually reinstalled with **Rocky 9.7** using four Ventoy USB sticks. Repos moved from el8.9 to el9.7, Lustre 2.15.8 target replaced by **2.17.0**. Kernel `5.14.0-611.13.1_lustre.el9`.

## Same IB problem, different cause

Lustre 2.17.0 kernel still ships without IB drivers. Copying stock `ib_core`, `mlx5_ib`, `rdma_cm`, `ib_ipoib` failed at load with `Too many levels of symbolic links` (errno 40), which was misleading. dmesg showed **BTF (BPF Type Format) validation failure**.

**Fix**: `strip --strip-debug --remove-section=.BTF` on every copied `.ko`, then `depmod -a`. IB stack loads, then Lustre `ko2iblnd` loads. LNET switched to `o2ib(ibs1)`; NIDs changed from `192.168.1.x@tcp` to `10.0.0.x@o2ib`.

## Deployment

- MGS + 2 MDTs + 16 OSTs reformatted with `--mgsnode=10.0.0.251@o2ib`. Physical SSDs: 2x 128 GB on heads, 16x 238.5 GB on compute. Capacity 3.7 TB.
- dd results: single node 165 MB/s write, 331 MB/s read; 8 nodes in parallel **1.38 GB/s write, 2.77 GB/s read**.

## Redundancy problem and FLR

Default layout striped over 16 OSTs behaves like RAID0: estimated ~9% annual data-loss probability. Lustre 2.17.0 **File Level Replication** (`lfs mirror create -N2`) mirrors across OSTs on different blades. `lfs mirror verify` matched checksums. Cost about 17% on writes (137 vs 165 MB/s). Planned tiers: critical VMs mirrored, normal striped, scratch unprotected. Usable capacity with 2-way mirror 1.85 TB.

## Commit

`10bdf85` 2026-01-14 "Deploy Lustre 2.17.0 with RDMA on Rocky 9.7 + FLR discovery". Verdict at this time still "not production ready" because of fragile cold boot (fixed in note 09).
