# Lab draft credentials (from nebula.tex, March 2025)

Source: password table and SQL snippet in `dump/Mellanox_SB7790/kapitoly/nebula.tex`. Kept as part of the thesis baseline because they document how the draft install was parameterized (OpenStack-style service list re-used for OpenNebula).

> These are lab-draft values from 2025-03. **Rotate all of them before any real deployment**, and never publish this file or the LaTeX/PDF with them. Empty value means the source left it blank.

| Name | Value |
|---|---|
| DB_PASS | 3a81192d09bb454cc35afe06f1cafc5711dec572 |
| DB_Oneadmin | 4be5d88f91795e71dce8f4bd626423eef224b30b |
| KEYSTONE_DBPASS | c7246b82ec9b8ca5a7a3fd9f82527e88e2cbc4e6 |
| GLANCE_DBPASS | dca5717ca9bb55581b099e45619da1ffa690e4ce |
| DASH_DBPASS | (empty) |
| NEUTRON_DBPASS | 564b8c564027a33d1cb2e6f724a7a61ca9b9cd0f |
| NOVA_DBPASS | 0eb74ae1f47c0c8495bcf4db9c775a898bc4047b |
| PLACEMENT_DBPASS | d30cfe364a80a7bb53bb758460f325c4292f3f3f |
| ADMIN_PASS | ebf440559b2034e003a4603276ea057cd41ba52e |
| USER_PASS | heslo |
| GLANCE_PASS | 7434063c6875ae43ada80c7267b7437c61ab3845 |
| DASH_PASS | (empty) |
| NEUTRON_PASS | 5b784b0a051a48b23edbd37ac8df53b00819d257 |
| NOVA_PASS | 170b9b7265e0785412ac20cb2539bfde8e21f9bf |
| PLACEMENT_PASS | b54867e5a60c03f0596bdf81f2226886af22e2d7 |

SQL snippet in the source (OpenNebula DB user):

```sql
CREATE USER 'oneadmin' IDENTIFIED BY '<DB_Oneadmin value>';
GRANT ALL PRIVILEGES ON opennebula.* TO 'oneadmin';
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Deployment notes

- Names like KEYSTONE/GLANCE/NEUTRON/NOVA/PLACEMENT/DASH belong to OpenStack, which was dropped (repo note 02). Only DB_PASS, DB_Oneadmin and possibly ADMIN_PASS map to OpenNebula.
- Later deployment (2026-05) uses Ansible vault (`group_vars/all/secret.yml`) for secrets instead of a table in a document.
- `USER_PASS` = `heslo` (Czech for "password"): placeholder.
