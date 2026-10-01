# data

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Stability data

`stability_data.json` holds the stability tests of the Lustre cluster (cold boots, startup-script fix, integrity, findings, planned tests). It is separate from `benchmark_data.json`, so `index.ts` and the charts are unaffected. Raw CSVs and console logs of every run are in `stability/` (copied from `UJEP-LAB/benchmarks/stability`, which stays the source of truth; regenerate the JSON from there). `stability/NEXT.md` is the plan for the remaining tests.
