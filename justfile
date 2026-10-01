# Thesis repo tasks. List with `just`.

set shell := ["bash", "-euo", "pipefail", "-c"]

# user-level TeX Live (LuaLaTeX, biber, texlua)
export PATH := env("HOME") + "/.local/texlive/current/bin/x86_64-linux:" + env("PATH")

default:
    @just --list

# Serve the root site (server.ts)
serve:
    bun run server.ts

# Check that data JSON parses
check:
    python3 -c "import json; [json.load(open(f)) for f in ('data/benchmark_data.json','data/stability_data.json','data/stability_charts.json')]; print('json ok')"

# Compile the thesis with LuaLaTeX + biber (scripted in base/build.lua; the JSON -> CSV data step runs inside LuaLaTeX)
thesis:
    cd base && texlua build.lua thesis 2> >(grep -v '^Fontconfig' >&2)

# Compile only the figures (base/figures-test.tex)
figures:
    cd base && texlua build.lua figures 2> >(grep -v '^Fontconfig' >&2)

# Copy ../data/stability_charts.json into base/data/src (the Overleaf-visible source)
sync:
    cd base && texlua build.lua sync

# Remove build output and generated CSVs in base/
clean:
    cd base && texlua build.lua clean

# Zip base/ for upload to Overleaf (set the compiler to LuaLaTeX there)
overleaf: sync
    cd base && rm -f ../overleaf.zip && zip -rq ../overleaf.zip . -x '.git/*' -x '*.pdf' -x '*.aux' -x '*.log' -x 'data/*.csv'
    @echo "wrote overleaf.zip"
