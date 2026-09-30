# 09 - 2026-05-07: cold-boot failure, lustre-startup.service, kubeadm + Rancher

Sources: `lustre/log.md`, `docs/Lustre.md`, commits `3db7a74` to `c2b58ea`. All on one day (about 8 commits).

## Cold-boot postmortem

After about 6 weeks powered off, no node had `/mnt/lustre`. Causes:

1. MGS is a 10 GB sparse file on a loop device (`/dev/loop10`); nothing bound it at boot.
2. `nofail` on the MGS `fstab` line propagated to ldiskfs (`Unknown parameter 'nofail'`), giving `-22 EINVAL`, while systemd treated the failure as success.
3. Two OSTs lost a `_netdev` race against ldiskfs init.
4. Cascade: clients time out with `-110` because they cannot fetch config from MGS.

Manual recovery order: clients, OSTs, MDTs, MGS down; `losetup`; MGS, MDTs, OSTs, clients up.

## lustre-startup.service

Bash orchestrator `/usr/local/sbin/lustre-startup` (role from hostname): LNET, MGS, MDT, OSTs, client. Key design:
- binds `loop10` before MGS mount; MGS mounted without extra options
- MDT found by volume label (`blkid -L`), defeating the Supermicro `sda`/`sdb` swap
- `robust_mount` with `mountpoint -q` as ground truth, up to 5 retries
- `lctl` wrapped in `timeout` (RDMA queue-pair wedge on cold boot)
- MDT `-o abort_recov` skips the 3-5 min recovery window (about 25 s after)
- Type=oneshot, RemainAfterExit, TimeoutStartSec=600; fstab MGS/MDT lines commented out on heads

Validation: Compute-1 reboot ~30 s; Head-1 reboot ~75 s; full IPMI power cycle 4:26 wall, of which ~56 s orchestrator work. Three test iterations exposed the `lctl ping` hang and the recovery wait.

**Lustre verdict flipped to selected.** Reason recorded: each other candidate failed exactly one hard requirement; a fifth storage change would have cost four months for marginal gain on a SATA-bound cluster (~8 GB/s ceiling).

## Kubernetes (kubeadm) stages 7-17

Replaced K3s. Sequence: containerd + kubeadm prereqs, keepalived VIP 192.168.1.250 + HAProxy :8443, `kubeadm init/join` + Flannel + Lustre StorageClass/PV (3.5 TiB), MetalLB, Nginx Ingress, TLS (`*.lab.local`), kube-prometheus-stack, Headlamp, then Rancher Manager (stage 15), Rancher chart repos (16), dynamic PV provisioner on Lustre (17, 2026-05-14).

Gotchas fixed:
- containerd package ships `disabled_plugins = ["cri"]`, which broke kubeadm
- VRRP firewall rich rule tokenized by `command` module, so both heads became MASTER
- Kubernetes Dashboard Helm repo 404, replaced by Headlamp, then by Rancher (manual ServiceAccounts and token doc removed for security)
- node-exporter port 9100 collided with `sysmon-probe`, moved to 9101
