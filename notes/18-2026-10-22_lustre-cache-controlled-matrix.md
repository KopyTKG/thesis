# 18 - 2026-10-22: cache-controlled Lustre performance matrix

Sources: `UJEP-LAB/benchmarks/lustre` (CSVs, raw JSON, logs, RESULTS.md), tools `tools/lustre_bench.py` and `tools/make_lustre_data.py`, thesis `data/lustre_perf_data.json` and `data/lustre/`. This is the re-run asked for in note 14, section 1 (R3: is the pool limited by the SATA drives and not by the network? were the March numbers inflated by cache?).

## Method

fio 3.35 (libaio, `direct=1`, 4 jobs per client, 4 GiB per job, 45 s time-based phases) on 1, 4 and 8 of the 8 computes (each is client and OSS), 3 repeats per cell, 4 phases (sequential write and read at 1 MiB, random read and write at 4 KiB). Two configurations: **default** (stripe 1 x 4 MiB, 8 RPCs in flight, 2000 MB dirty, read-ahead 1024/256) and **tuned** (stripe 4 x 4 MiB, 32 RPCs, 64 MB dirty, read-ahead 256/128: the client-side part of the March tuning; `sync_journal=0` was deliberately not applied). Client caches are bypassed by direct I/O; the OSS read and write-through caches (`osd-ldiskfs.*.read_cache_enable`, `writethrough_cache_enable`) are **0 on every OST as found**. A control stage switched them on and restored 0. Caches are dropped before every phase; 16 GiB per client, deleted after each repeat. 72 matrix measurements, **0 I/O errors**.

## Results


### Aggregate throughput, MiB/s (Gbit/s), mean over 3 repeats, direct I/O, OSS caches off

**Sequential write, 1 MiB blocks**

| config | 1 client | 4 clients | 8 clients |
|---|---|---|---|
| default | 441 +- 36 (3.7) | 1,293 +- 54 (10.8) | 2,009 +- 20 (16.9) |
| tuned | 926 +- 15 (7.8) | 1,774 +- 34 (14.9) | 2,277 +- 65 (19.1) |

**Sequential read, 1 MiB blocks**

| config | 1 client | 4 clients | 8 clients |
|---|---|---|---|
| default | 1,898 +- 133 (15.9) | 6,140 +- 643 (51.5) | 7,478 +- 9 (62.7) |
| tuned | 5,478 +- 79 (45.9) | 5,905 +- 203 (49.5) | 6,073 +- 72 (50.9) |

**Random read, 4 KiB**

| config | 1 client | 4 clients | 8 clients |
|---|---|---|---|
| default | 757 +- 13 (6.3) | 2,628 +- 112 (22.0) | 4,095 +- 29 (34.4) |
| tuned | 676 +- 48 (5.7) | 2,438 +- 35 (20.4) | 3,837 +- 274 (32.2) |

**Random write, 4 KiB**

| config | 1 client | 4 clients | 8 clients |
|---|---|---|---|
| default | 3 +- 1 (0.0) | 8 +- 0 (0.1) | 17 +- 1 (0.1) |
| tuned | 5 +- 0 (0.0) | 16 +- 0 (0.1) | 31 +- 0 (0.3) |

**Random 4 KiB, aggregate IOPS (mean)**

| phase | config | 1 client | 4 clients | 8 clients |
|---|---|---|---|---|
| rand_read_4k | default | 193,745 | 672,657 | 1,048,356 |
| rand_read_4k | tuned | 173,064 | 624,030 | 982,157 |
| rand_write_4k | default | 666 | 2,156 | 4,445 |
| rand_write_4k | tuned | 1,256 | 4,166 | 7,880 |

### Cache control: 8 clients, tuned layout, 128 GiB working set

| OSS cache | write MiB/s | read MiB/s (Gbit/s) |
|---|---|---|
| off | 2,433 | 7,358 (62) |
| on | 2,264 | 72,889 (611) |

### Drive ceilings

- Raw sequential read of the 16 pool SSDs, one at a time, measured after the link downshifts: sum **7,967 MiB/s** (66.8 Gbit/s); 14 drives at 528-531 MiB/s, 2 at about 272 MiB/s (SATA II link).
- Same 16 drives at full speed (14 measured x 16): about **8,484 MiB/s**; spec 16 x 540 MB/s = 8,240 MiB/s.
- Bare-SSD sequential write measured in March 2026 (before the OSTs were formatted): mean 249 MiB/s per drive, 16 drives about **3,990 MiB/s**.

### How close to the drives

- Best cold read (default, 8 clients) 7,478 MiB/s = **94%** of the measured drive sum (7,967), 88% of 16 full-speed drives.
- Tuned, 8 clients: 6,073 MiB/s = 76% of the measured sum: more stripes and RPCs in flight do not help once every drive is busy.
- Best write (tuned, 8 clients) 2,277 MiB/s = **57%** of the March bare-SSD write sum; the rest is Lustre/ldiskfs overhead.

## Findings

1. **OSS cache inflates reads about 10x.** Same workload, 8 clients: 7.4 GB/s cold with the cache off (as found), 72.9 GB/s (611 Gbit/s) with it on, i.e. reads served from server RAM at about the wire rate of each client's EDR link. Writes are unaffected (2.3-2.4 GB/s either way).
2. **With the cache out of the way, reads are drive-limited, which supports R3.** The best cold read (default layout, 8 clients, 7,478 MiB/s) is 94% of what the 16 drives deliver in a raw test (7,967 MiB/s) and 88% of 16 full-speed drives. The InfiniBand fabric is not the limit (per client about 8 Gbit/s of a 100 Gbit/s link). The March 2026 "tuned" read of 12.2 GB/s is not reproducible: it exceeds the 16-drive ceiling (8.6 GB/s spec), so it was inflated.
3. **Tuning helps few clients and hurts many for reads.** One client: tuned gives 3x the read (5.5 vs 1.9 GB/s) and 2.1x the write (926 vs 441 MiB/s). Eight clients: default reads are better (7.5 vs 6.1 GB/s); tuned writes are 13% better (2.28 vs 2.01 GB/s). With all drives busy anyway, more stripes and RPCs in flight add contention. For a multi-client/VM workload the plain stripe-1 default is the better read layout.
4. **Writes reach 57% of the bare drives.** Best write 2.28 GB/s (tuned, 8 clients) vs about 3.99 GB/s for 16 drives measured in March before formatting; the remainder is Lustre/ldiskfs overhead (journal, RPC), not the drives or the fabric. The March tuned write (2.6 GB/s) is reproduced within about 10%.
5. **Random 4 KiB: reads scale to about 1.0 M IOPS, writes collapse to about 4-8 k IOPS.** Eight clients: 1,048,356 read IOPS (default) against 4,445 write IOPS (default) and 7,880 (tuned), i.e. writes are 0.4-0.8% of reads (17-31 MiB/s). Direct small writes are synchronous round trips through the OST journal. Consequence for the VM layer: guest disks on a Lustre datastore will be slow for small synchronous/fsync-heavy writes; use host write-back caching and larger blocks, and measure inside a VM (OpenNebula stage).
6. **Hardware: SATA link errors under full-speed load (see below).**

## Hardware finding: three drive links error out at full speed

During the control stage (14:40) the first full-speed read load produced `READ FPDMA QUEUED` failures and `hard resetting link` on three drives; two were downshifted by the kernel to SATA II:
- **Compute-7 `sdb`** (14:43:37) and **Compute-3 `sda`, OST5** (14:44:02): link 3.0 Gbit/s, raw read 271.6-271.7 MiB/s (half of the 529-531 of the other 14 drives), 50.8 k random-read IOPS vs 97.5 k.
- Still at 6.0 Gbit/s but erroring: **Compute-3 `sdc`** (4 resets during the matrix, 23 CRC errors), **Compute-1 `sda`** (OST0, one reset, 2 CRC errors), Compute-7 `sda` (1 CRC error).
- SMART attribute 199 (CRC errors) is non-zero exactly on these drives and 0 on the rest; uncorrectable/media errors 0 everywhere; no filesystem or I/O errors in dmesg; fio saw 0 errors (the link layer caught and retried every error). The pattern is signal integrity on specific bays (cable, connector or backplane), not failing drives.
- March 2026: all drives read 528-531 MiB/s. The 6 h soak (about 170 MB/s per drive) logged no link errors. **The whole matrix therefore ran with two drives at half speed**, which is why the drive-sum ceiling is 7,967 and not 8,484 MiB/s.
- Action (physical): reseat/replace the SATA cables or backplane connectors on Compute-3 (both pool bays), Compute-7 (`sdb`) and Compute-1 (`sda`), then re-run `baseline` and the matrix; until then avoid saturating all drives.

## Limits

Single configuration pair, 3 repeats, 4 jobs per client; read results include two half-speed drives; the write ceiling comes from a March measurement (a write baseline cannot be taken now: an OST mount is not a writable directory, and raw devices must not be written while Lustre uses them); no metadata benchmark (mdtest) and no IOR yet.
