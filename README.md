# fundgraph-cli

`fundgraph-cli` is the executable command-line interface for FundGraph.

It will own command parsing, terminal output, configuration, exit codes, CLI-specific error presentation, and CLI tests. It must consume `@fundgraph/core` rather than duplicate domain, evidence, parser, or relationship logic. It must not move money, manage wallets, or infer maintainer identity.

The project-level source of truth is in the sibling [`fundgraph`](../fundgraph/README.md) repository. The reusable library is in [`fundgraph-core`](../fundgraph-core/README.md). The dependency direction is `fundgraph-cli` → `fundgraph-core` through a released package version.

Phase 0 created the repository boundary only. Phase 1 will establish the package/build baseline; the CLI is not implemented yet.

