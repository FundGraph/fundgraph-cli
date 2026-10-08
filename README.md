# fundgraph-cli

`fundgraph-cli` is the executable command-line interface for FundGraph.

It will own command parsing, terminal output, configuration, exit codes, CLI-specific error presentation, and CLI tests. It must consume `@fundgraph/core` rather than duplicate domain, evidence, parser, or relationship logic. It must not move money, manage wallets, or infer maintainer identity.

The project-level source of truth is in the sibling [`fundgraph`](../fundgraph/README.md) repository. The reusable library is in [`fundgraph-core`](../fundgraph-core/README.md). The dependency direction is `fundgraph-cli` → `fundgraph-core` through a released package version.

## Phase 2 command surface

The CLI is implemented and currently accepts a JSON model document as either a file path or stdin. The document is an array of versioned FundGraph models or an object with a `models` array. Dependency discovery from project manifests begins in Phase 3.

```text
fundgraph --help
fundgraph version
fundgraph analyze [PATH] [--format text|json] [--offline] [--strict]
```

Use `-` or omit `PATH` to read stdin. `--offline` is explicit and Phase 2 performs no network access. Default mode reports invalid models as diagnostics with exit code `1`; `--strict` returns invalid-input exit code `2`. Usage and input errors return `2`; unexpected failures return `3`.

Development commands:

```text
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

For local sibling development before `@fundgraph/core` is published, build the core repository first, then install it without changing this package's published dependency contract:

```text
cd ../fundgraph-core
npm install
npm run build
cd ../fundgraph-cli
npm install --ignore-scripts --no-save ../fundgraph-core
npm test
```

