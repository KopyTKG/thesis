# 16 - Assignment: supervisor review of v6 and the changes in v7

Source: Moodle comments on `zadani/v6.html` (2 comments, Saturday 31 January 2026, 14:07 and 14:08, by the reviewer Jiří Fišer) and `zadani/v7.html`.

## Review of v6 (translated)

The literature does not cover all points of the theory part. Mainly missing:
- **Principles and standards of building infrastructure for isolated testing of applications:** nothing in the literature.
- **Comparison of network protocols and the specifics of IPoIP:** IP over InfiniBand is only a marginal part of the whole topic.
- **Comparison of Ethernet and InfiniBand:** again IP over InfiniBand, practically does not address the comparison.
- **Recommendation:** drop the Ethernet versus InfiniBand comparison from the theory part, name the second topic IP over InfiniBand (it can start with a short introduction of what InfiniBand is), and above all add literature for "Principles and standards of building infrastructure for isolated testing of applications" (which is critical for this thesis).
- Second comment: the other parts of the assignment seem usable.

## What changed in v7 (`zadani/v7.html`, v6 was an exact copy before editing)

- Theory outline: the item "porovnání technologií Ethernet a InfiniBand" is removed.
- The IPoIB item is renamed to "IP over InfiniBand (IPoIB): stručný úvod do InfiniBandu a specifika IPoIB" (short InfiniBand introduction plus IPoIB).
- The isolated-testing item is made concrete: isolation of virtualized environments, network segmentation, security requirements, infrastructure as a service.
- Literature: four NIST publications added, in the same format as the existing entries (alphabetical, between IETF and OpenNebula):
  - SP 800-125 Guide to Security for Full Virtualization Technologies (2011)
  - SP 800-125B Secure Virtual Network Configuration for Virtual Machine (VM) Protection (2016)
  - SP 800-145 The NIST Definition of Cloud Computing (2011)
  - SP 800-115 Technical Guide to Information Security Testing and Assessment (2008)
  The URLs were checked on 2026-10-01 (HTTP 200, titles match), and that date is used as the access date.
- Literature: the Ceph documentation entry is replaced by the Lustre operations manual (Ceph is not part of the thesis text, the storage layer is Lustre). The Lustre URL was checked on 2026-10-01 (HTTP 200, "Lustre Software Release 2.x"); the manual has no single publication year, so the entry has none.
- Not changed: annotation, goals, outputs, practical part, other literature. The Moodle comments list in the file is still empty.

## Effects on the thesis

- `base/chapters`: the theory part no longer needs an Ethernet versus InfiniBand chapter. The measured IB versus Ethernet-mode facts (40 Gb/s direct Ethernet link, no Ethernet switch, 90 to 92 Gb/s InfiniBand) belong in the practical network chapter, not the theory.
- The isolated-testing chapter needs real content: NIST SP 800-125 and 125B (isolation of VMs, virtual networks), SP 800-145 (IaaS model), SP 800-115 (testing practice). It is the part the reviewer calls critical. Candidates not yet checked: ISO/IEC/IEEE 29119 (software testing standard; the ISO page blocked the automatic check), CIS benchmarks.
- A real reference check is still needed: these entries came from NIST's catalogue pages, I did not read the documents. Read them before citing specific claims.
