# dotfiler — design

A web service to register GitHub-hosted dotfiles repositories, list them, and search them by the tools they manage. Hosted on Cloudflare Workers.

## Users and core loop

Visitor pastes a GitHub repo URL (or `owner/repo`). The service fetches the repo tree via the GitHub API, detects known tools from file paths, and stores the result. The index page lists all registered repos with their detected tools; a search box filters by tool name or repo name. Clicking a tool tag filters the list to repos using that tool.

## Stack decision

| Option | Notes | Verdict |
| --- | --- | --- |
| Hono JSX SSR + vanilla client JS | One runtime, no hydration, smallest surface. Search works as a plain GET form; progressive enhancement optional. | **Chosen** |
| HonoX (islands) | File-based routing + islands. Adds a framework layer for one page of interactivity. | Rejected (laziness-protocol) |
| API + React SPA | Two builds, client state, hydration. Overkill for list+search. | Rejected |

Toolchain: TypeScript strict, Hono, `@cloudflare/vite-plugin` (Vite, rolldown/oxc-based pipeline), `oxlint` for linting, `vitest` for the pure detection logic, `wrangler` for D1 migrations. Package manager: pnpm.

Storage: D1 (two tables, relational search by tool). KV rejected: tool→repos inverted index would be hand-maintained.

## Data shape (named first)

```ts
// DB rows
type RepoRow = {
  id: number;              // autoincrement PK
  owner: string;
  name: string;            // UNIQUE(owner, name)
  description: string | null;
  stars: number;
  default_branch: string;
  html_url: string;
  registered_at: string;   // ISO
  scanned_at: string;      // ISO
};

type RepoToolRow = {
  repo_id: number;         // FK -> repos.id, ON DELETE CASCADE
  tool_slug: string;       // FK by convention into TOOL_REGISTRY
  matched_path: string;    // first path that matched, evidence for the UI
  // PK (repo_id, tool_slug)
};

// Static registry, source of truth for detection and display
type ToolDef = {
  slug: string;            // "neovim"
  name: string;            // "Neovim"
  category: 'editor' | 'shell' | 'terminal' | 'multiplexer' | 'vcs' | 'wm' | 'launcher' | 'prompt' | 'package' | 'runtime' | 'cli' | 'other';
  match: (path: string) => boolean;  // against repo-relative paths, lowercased
};
```

Detection is a pure function `detectTools(paths: string[]): { slug: string; matchedPath: string }[]` (boundary-discipline: GitHub JSON is parsed/validated at the fetch boundary; detection trusts typed input). Registry covers ~40 common tools: nvim/vim, emacs, helix, zsh/bash/fish/nushell, tmux/zellij, starship/powerlevel10k, alacritty/kitty/wezterm/ghostty/iterm2, git, Brewfile/nix/home-manager, mise/asdf/direnv, atuin, fzf, ripgrep, bat, eza, lazygit, gh, karabiner, hammerspoon, yabai/skhd/aerospace/sketchybar, i3/sway/hyprland/waybar, vscode, ssh, curl, etc.

## HTTP surface

- `GET /` — index: register form, tool facet cloud (with counts), repo list. `?q=` filters by tool slug/name or owner/name substring; `?tool=` exact tool filter.
- `POST /repos` — body `repo=<url or owner/name>`. Parses input, fetches GitHub metadata + tree, detects tools, upserts repo + replaces its tools (idempotent re-registration = re-scan). Redirects to `/` (PRG). Errors re-render form with message.
- `GET /repos/:owner/:name` — detail: metadata, detected tools with matched paths, re-scan button (`POST /repos` with same input).

Registration/re-scan is idempotent (make-operations-idempotent): upsert keyed on `(owner, name)`, tools replaced in one batch.

Failure handling at the boundary: invalid input → 400 with message; GitHub 404 → "repository not found"; 403 rate-limit → readable message; `truncated: true` trees → detect over the partial list and note it.

## UI direction

Server-rendered, single stylesheet, no client framework. Design via the frontend-design skill (claude design): distinctive typography-led look, light/dark via `prefers-color-scheme`, tool tags as the primary visual element. Search box submits as GET form; small inline script for instant client-side filtering of the already-rendered list (progressive enhancement only).

## Out of scope (v1)

Auth/accounts, webhooks/auto-refresh, pagination (fine below ~500 repos), GitHub token config (optional `GITHUB_TOKEN` env passthrough is included since it's two lines).
