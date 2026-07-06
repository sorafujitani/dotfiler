# dotfiler

A registry of dotfiles repositories, indexed by the tools they configure.

Paste a GitHub repository (`owner/repo` or a full URL). dotfiler fetches the repo tree via the GitHub API, detects known tools (Neovim, zsh, tmux, Homebrew, Nix, ...) from file paths, and lists every registered repo with its tool tags. Search filters by tool or repo name; clicking a tag filters to repos using that tool. Re-registering a repo re-scans it.

Built with Hono (JSX SSR) on Cloudflare Workers, with D1 for storage. No client framework; the search box works as a plain GET form with a small inline script for instant filtering.

## Development

```sh
pnpm install
pnpm db:migrate:local   # apply D1 migrations to the local database
pnpm dev                # vite dev server with the Workers runtime
```

Other scripts:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

An optional `GITHUB_TOKEN` (set in `.dev.vars` locally, or as a Worker secret) raises the GitHub API rate limit; unauthenticated requests work but are limited to 60/hour.

## Deploy

1. Create a D1 database: `wrangler d1 create dotfiler`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with the real one.
3. Apply migrations remotely: `wrangler d1 migrations apply DB --remote`.
4. `pnpm deploy` (builds with Vite, then `wrangler deploy`).
