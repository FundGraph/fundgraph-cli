# fundgraph-cli

`fundgraph-cli` is the executable command-line interface for FundGraph.

It will own command parsing, terminal output, configuration, exit codes, CLI-specific error presentation, and CLI tests. It must consume `@fundgraph/core` rather than duplicate domain, evidence, parser, or relationship logic. It must not move money, manage wallets, or infer maintainer identity.

The project-level source of truth is in the sibling [`fundgraph`](../fundgraph/README.md) repository. The reusable library is in [`fundgraph-core`](../fundgraph-core/README.md). The dependency direction is `fundgraph-cli` → `fundgraph-core` through a released package version.

## Command surface and reports

The CLI is implemented and accepts a supported project directory, a JSON model document as a file path, or stdin. Directory analysis currently discovers npm, PyPI, and Cargo dependencies through `@fundgraph/core`; registry metadata and funding analysis remain later phases.

```text
fundgraph --help
fundgraph version
fundgraph analyze [PATH] [--format text|json] [--offline] [--strict]
```

Use `-` or omit `PATH` to read stdin. `--offline` is explicit and current discovery performs no network access. Model-document and directory analysis both emit the core deterministic report: text mode shows it after the compatibility summary, while JSON mode adds it under `report`. The CLI does not silently enable live network calls; callers that need network-assisted workflows use the core `NetworkClient` with explicit cache and offline options. Default mode reports invalid models as diagnostics with exit code `1`; `--strict` returns invalid-input exit code `2`. Usage and input errors return `2`; unexpected failures return `3`.

The CLI test suite includes a smoke test against the shared `fundgraph-core/test/fixtures/npm-workspace` fixture; fixture ownership remains with the core repository.

Development commands:

```text
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

See the sibling [`fundgraph` contributor guide](../fundgraph/docs/CONTRIBUTOR_GUIDE.md) and
[`COMPATIBILITY_POLICY.md`](../fundgraph/docs/COMPATIBILITY_POLICY.md) before changing the command contract.

CI verifies Ubuntu, Windows, and macOS on Node 20 and Node 22. It installs the sibling `fundgraph-core` repository before testing and uploads a package artifact without publishing it.

For local sibling development before `@fundgraph/core` is published, build the core repository first, then install it without changing this package's published dependency contract:

```text
cd ../fundgraph-core
npm install
npm run build
cd ../fundgraph-cli
npm install --ignore-scripts --no-save ../fundgraph-core
npm test
```

