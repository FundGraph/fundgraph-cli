# Contributing to fundgraph-cli

Read the sibling `fundgraph` repository's `PROJECT_CONTEXT.md`, `ROADMAP.md`, `docs/CONTRIBUTOR_GUIDE.md`, and
`docs/COMPATIBILITY_POLICY.md` before changing the executable.

Keep domain, evidence, parser, and relationship logic in `fundgraph-core`. CLI changes must preserve documented commands,
exit codes, safe bounded input handling, and explicit offline behavior. Build/install the sibling core package as described
in this README, then run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
