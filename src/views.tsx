import type { Child } from 'hono/jsx';
import type { BrowseView, RepoWithTools } from './db';
import { categoryCounts, indexHref, sortedCategories, surpriseHref, type IndexQuery } from './browse';
import { CATEGORY_LABEL, TOOL_BY_SLUG, type ToolCategory } from './registry';

const CSS = `
:root {
  --bg: #f0ebe3;
  --surface: #faf7f2;
  --surface-inset: #f5f1ea;
  --ink: #1a1814;
  --muted: #6f6a62;
  --accent: #1d4ed8;
  --accent-soft: #dbeafe;
  --on-accent: #faf7f2;
  --line: #d4cdc2;
  --line-strong: #b8aea0;
  --mono: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1014;
    --surface: #161922;
    --surface-inset: #12151d;
    --ink: #e8eaef;
    --muted: #8b93a7;
    --accent: #6ea8fe;
    --accent-soft: #1e2a42;
    --on-accent: #0e1014;
    --line: #282d3a;
    --line-strong: #363c4d;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--serif);
  font-size: 1rem;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
a:focus-visible, input:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.page { max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem 5rem; }

.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.wordmark {
  font-family: var(--mono);
  font-size: clamp(1.75rem, 5vw, 2.35rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  margin: 0;
  line-height: 1.1;
}
.wordmark a { text-decoration: none; }
.dot { color: var(--accent); }
.tagline { margin: 0.65rem 0 0; color: var(--muted); font-size: 0.975rem; max-width: 28rem; line-height: 1.65; }
.stats {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
  white-space: nowrap;
  padding-top: 0.5rem;
}

.panel {
  margin-top: 2.5rem;
  padding: 1.35rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}
.panel-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 1rem;
}

.register { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.register input {
  flex: 1;
  min-width: 12rem;
  font-family: var(--mono);
  font-size: 0.875rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-inset);
  color: var(--ink);
}
.register input::placeholder { color: var(--muted); }
.register input:focus { border-color: var(--accent); }

button, .btn {
  font-family: var(--mono);
  font-size: 0.875rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
button:hover, .btn:hover { filter: brightness(1.06); }
.btn-ghost {
  background: transparent;
  color: var(--muted);
  border-color: var(--line);
}
.btn-ghost:hover { color: var(--ink); border-color: var(--line-strong); background: var(--surface-inset); }

.flash { margin: 1.25rem 0 0; padding: 0.75rem 1rem; border-radius: 4px; font-family: var(--mono); font-size: 0.8rem; }
.flash-error { border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line)); color: var(--accent); background: var(--accent-soft); }
.flash-notice { border: 1px solid var(--line); color: var(--muted); background: var(--surface-inset); }

.browse { margin-top: 3rem; }
.browse-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.section-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}
.section-label-spaced { margin: 2.25rem 0 1rem; }
.detail-title-spaced { margin-top: 1.75rem; }
.back-link { margin-top: 2rem; }
.browse-meta { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }

.view-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.view-tab {
  font-family: var(--mono);
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  text-decoration: none;
  color: var(--muted);
  background: var(--surface-inset);
}
.view-tab[aria-current="true"] {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
.explore-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.explore-bar .tags { flex: 1; min-width: 12rem; margin-bottom: 0; }
.surprise-btn { flex-shrink: 0; white-space: nowrap; }

.search { margin: 0 0 1.25rem; }
.search input {
  width: 100%;
  font-family: var(--mono);
  font-size: 0.875rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--ink);
}
.search input::placeholder { color: var(--muted); }
.search input:focus { border-color: var(--accent); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.browse .tags { margin-bottom: 1.5rem; }
.tag {
  font-family: var(--mono);
  font-size: 0.75rem;
  text-decoration: none;
  padding: 0.2rem 0.5rem 0.25rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  background: var(--surface-inset);
}
.tag:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.tag[aria-current="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.tag .dot { font-weight: 700; color: var(--accent); }
.tag-count { color: var(--muted); margin-left: 0.5ch; font-size: 0.7rem; }
.clear-filter { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); margin-left: 0.5rem; }
.clear-filter:hover { color: var(--accent); }

.repo-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); overflow: hidden; }
.repo { padding: 1.15rem 1.25rem; border-bottom: 1px solid var(--line); }
.repo:last-child { border-bottom: 0; }
.repo:hover { background: var(--surface-inset); }
.repo-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.repo-name { font-family: var(--mono); font-size: 0.925rem; font-weight: 700; text-decoration: none; overflow-wrap: anywhere; }
.repo-name:hover { color: var(--accent); }
.repo-meta { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); white-space: nowrap; flex-shrink: 0; }
.repo-meta-soft { opacity: 0.8; }
.repo-desc {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.repo .tags { margin-top: 0.85rem; }
.empty { color: var(--muted); font-style: italic; font-size: 0.925rem; margin: 1.25rem 0 0; }

.crumb { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }
.crumb a { text-decoration: none; }
.crumb a:hover { color: var(--accent); }
.detail-header { margin-top: 1.75rem; }
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
}
.detail-title-wrap { flex: 1; min-width: 12rem; }
.detail-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.detail-title { font-family: var(--mono); font-size: clamp(1.25rem, 4vw, 1.75rem); letter-spacing: -0.02em; margin: 0; overflow-wrap: anywhere; }
.detail-desc { margin: 0.65rem 0 0; color: var(--muted); font-size: 0.975rem; line-height: 1.6; }
.github-link {
  font-family: var(--mono);
  font-size: 0.8rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}
.github-link:hover { background: var(--accent); color: var(--on-accent); }
.share-link {
  font-family: var(--mono);
  font-size: 0.8rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  text-decoration: none;
  white-space: nowrap;
}
.share-link:hover { border-color: var(--line-strong); color: var(--ink); background: var(--surface-inset); }
.flash-notice .share-link {
  font-size: inherit;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
}
.flash-notice .share-link:hover { background: transparent; text-decoration: underline; }
.detail-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1.5rem;
  margin-top: 1.15rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
}

.meta-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem 1.5rem;
  margin: 2rem 0 0;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  font-family: var(--mono);
  font-size: 0.8rem;
}
.meta-key { color: var(--muted); }
.meta-val { overflow-wrap: anywhere; }

.tool-rows { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); overflow: hidden; }
.tool-rows li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1.25rem;
  align-items: baseline;
  padding: 0.75rem 1.1rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.875rem;
}
.tool-rows li:last-child { border-bottom: 0; }
.tool-rows li:hover { background: var(--surface-inset); }
.matched-path { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); overflow-wrap: anywhere; text-align: right; }
.detail-actions { margin-top: 2.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }

footer { margin-top: 4rem; padding-top: 1.25rem; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 0.7rem; color: var(--muted); }
@media (prefers-reduced-motion: no-preference) {
  .tag, button, .btn, .github-link, .share-link, .repo, .tool-rows li, .view-tab { transition: border-color 120ms ease, color 120ms ease, filter 120ms ease, background 120ms ease; }
}
`;

const FILTER_SCRIPT = `
(() => {
  const input = document.querySelector('[data-filter-input]');
  if (!(input instanceof HTMLInputElement)) return;
  const rows = Array.from(document.querySelectorAll('[data-haystack]'));
  const empty = document.querySelector('[data-empty]');
  const count = document.querySelector('[data-visible-count]');
  const sync = () => {
    const needle = input.value.trim().toLowerCase();
    let visible = 0;
    for (const row of rows) {
      const hit = needle === '' || (row.getAttribute('data-haystack') || '').includes(needle);
      row.hidden = !hit;
      if (hit) visible += 1;
    }
    if (empty instanceof HTMLElement) empty.hidden = visible > 0;
    if (count instanceof HTMLElement) count.textContent = String(visible);
  };
  input.addEventListener('input', sync);
  sync();
})();
`;

export const Layout = (props: { title: string; children: Child }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="A registry of dotfiles repositories, indexed by the tools they configure." />
      <title>{props.title}</title>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </head>
    <body>
      <div class="page">
        {props.children}
        <footer>
          <span class="dot">.</span>dotfiler — reads public GitHub trees, nothing else.
        </footer>
      </div>
    </body>
  </html>
);

const toolName = (slug: string): string => TOOL_BY_SLUG.get(slug)?.name ?? slug;

const formatStars = (stars: number): string => (stars >= 1000 ? `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}k` : String(stars));

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

const Tag = (props: { slug: string; count?: number; active?: boolean; title?: string; href: string }) => (
  <a
    class="tag"
    href={props.href}
    aria-current={props.active === true ? 'true' : undefined}
    title={props.title ?? toolName(props.slug)}
  >
    <span class="dot">.</span>
    {props.slug}
    {props.count !== undefined && <span class="tag-count">{props.count}</span>}
  </a>
);

const CategoryChip = (props: { category: ToolCategory; count: number; active?: boolean; href: string }) => (
  <a class="tag" href={props.href} aria-current={props.active === true ? 'true' : undefined}>
    {CATEGORY_LABEL[props.category]}
    <span class="tag-count">{props.count}</span>
  </a>
);

const haystack = (repo: RepoWithTools): string =>
  [
    `${repo.owner}/${repo.name}`,
    repo.description ?? '',
    ...repo.tools.flatMap((tool) => [tool.tool_slug, toolName(tool.tool_slug)]),
  ]
    .join(' ')
    .toLowerCase();

const RepoItem = (props: { repo: RepoWithTools; activeTool: string; emphasizeStars: boolean; query: IndexQuery }) => {
  const repo = props.repo;
  const detailHref = `/repos/${repo.owner}/${repo.name}`;
  return (
    <li class="repo" data-haystack={haystack(repo)}>
      <div class="repo-head">
        <a class="repo-name" href={detailHref}>
          {repo.owner}/{repo.name}
        </a>
        {props.emphasizeStars ? (
          <span class="repo-meta" title={`${repo.stars} stars`}>
            {formatStars(repo.stars)} ★ · {plural(repo.tools.length, 'tool', 'tools')}
          </span>
        ) : (
          <span class="repo-meta repo-meta-soft">{plural(repo.tools.length, 'tool', 'tools')}</span>
        )}
      </div>
      {repo.description !== null && repo.description !== '' && <p class="repo-desc">{repo.description}</p>}
      {repo.tools.length > 0 && (
        <div class="tags">
          {repo.tools.map((tool) => (
            <Tag
              slug={tool.tool_slug}
              active={tool.tool_slug === props.activeTool}
              title={tool.matched_path}
              href={
                props.query.view === 'popular'
                  ? indexHref(props.query, { view: 'popular', category: '', tool: tool.tool_slug })
                  : detailHref
              }
            />
          ))}
        </div>
      )}
    </li>
  );
};

export type IndexProps = {
  repos: RepoWithTools[];
  counts: Map<string, number>;
  allRepos: RepoWithTools[] | null;
  q: string;
  tool: string;
  view: BrowseView;
  category: ToolCategory | '';
  formValue?: string;
  error?: string;
  notice?: string;
  shareUrl?: string;
};

export const IndexPage = (props: IndexProps) => {
  const facets = [...props.counts.entries()].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const categoryFacets =
    props.allRepos === null ? [] : sortedCategories(categoryCounts(props.allRepos));
  const query: IndexQuery = { view: props.view, q: props.q, tool: props.tool, category: props.category };
  const filtered = props.q !== '' || props.tool !== '' || props.category !== '';
  const toolTotal = facets.reduce((sum, [, count]) => sum + count, 0);
  const browseMetaSuffix = (() => {
    const parts: string[] = [];
    if (props.view === 'popular') {
      parts.push('sorted by stars');
      if (props.tool !== '') parts.push(`filtered by .${props.tool}`);
    } else {
      parts.push('shuffled');
      if (props.category !== '') parts.push(CATEGORY_LABEL[props.category]);
    }
    return parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
  })();
  return (
    <Layout title="dotfiler — a registry of dotfiles repositories">
      <header>
        <div class="hero">
          <div>
            <h1 class="wordmark">
              <a href="/">
                <span class="dot">.</span>dotfiler
              </a>
            </h1>
            <p class="tagline">Dotfiles repos, indexed by the tools they configure.</p>
          </div>
          {props.repos.length > 0 && (
            <p class="stats">
              {plural(props.repos.length, 'repo', 'repos')}
              {facets.length > 0 && ` · ${facets.length} tools · ${toolTotal} detections`}
            </p>
          )}
        </div>

        <div class="panel">
          <p class="panel-label">Register</p>
          <form class="register" method="post" action="/repos">
            <input
              type="text"
              name="repo"
              value={props.formValue ?? ''}
              placeholder="https://github.com/owner/repo"
              aria-label="GitHub repository to register"
              required
            />
            <button type="submit">add</button>
          </form>
        </div>

        {props.error !== undefined && (
          <p class="flash flash-error" role="alert">
            {props.error}
          </p>
        )}
        {props.notice !== undefined && (
          <p class="flash flash-notice">
            {props.notice}
            {props.shareUrl !== undefined && (
              <>
                {' '}
                <a class="share-link" href={props.shareUrl} rel="noopener noreferrer" target="_blank">
                  Share on X ↗
                </a>
              </>
            )}
          </p>
        )}
      </header>

      <section class="browse" aria-label="Browse repositories">
        <div class="browse-head">
          <h2 class="section-label">Browse</h2>
          <span class="browse-meta">
            <span data-visible-count>{props.repos.length}</span> shown{browseMetaSuffix}
          </span>
        </div>

        <nav class="view-tabs" aria-label="Browse mode">
          <a
            class="view-tab"
            href={indexHref(query, { view: 'popular', category: '' })}
            aria-current={props.view === 'popular' ? 'true' : undefined}
          >
            Popular
          </a>
          <a
            class="view-tab"
            href={indexHref(query, { view: 'explore', tool: '' })}
            aria-current={props.view === 'explore' ? 'true' : undefined}
          >
            Explore
          </a>
        </nav>

        <form class="search" method="get" action="/">
          <input
            type="search"
            name="q"
            value={props.q}
            placeholder="Filter repos and tools…"
            aria-label="Filter repositories"
            data-filter-input
          />
          {props.view === 'explore' && <input type="hidden" name="view" value="explore" />}
          {props.category !== '' && <input type="hidden" name="category" value={props.category} />}
          {props.tool !== '' && props.view === 'popular' && <input type="hidden" name="tool" value={props.tool} />}
          <button type="submit" class="sr-only">
            Search
          </button>
        </form>

        {props.view === 'popular' && facets.length > 0 && (
          <div class="tags">
            {facets.map(([slug, count]) => (
              <Tag
                slug={slug}
                count={count}
                active={slug === props.tool}
                href={indexHref(query, {
                  view: 'popular',
                  category: '',
                  tool: slug === props.tool ? '' : slug,
                })}
              />
            ))}
            {props.tool !== '' && (
              <a class="clear-filter" href={indexHref({ view: 'popular', q: '', tool: '', category: '' })}>
                clear
              </a>
            )}
          </div>
        )}

        {props.view === 'explore' && (
          <div class="explore-bar">
            {categoryFacets.length > 0 && (
              <div class="tags">
                {categoryFacets.map(([category, count]) => (
                  <CategoryChip
                    category={category}
                    count={count}
                    active={category === props.category}
                    href={indexHref(query, {
                      view: 'explore',
                      tool: '',
                      category: category === props.category ? '' : category,
                    })}
                  />
                ))}
                {props.category !== '' && (
                  <a class="clear-filter" href={indexHref(query, { category: '' })}>
                    clear
                  </a>
                )}
              </div>
            )}
            <a class="btn btn-ghost surprise-btn" href={surpriseHref(query)}>
              Surprise me
            </a>
          </div>
        )}

        <ul class="repo-list">
          {props.repos.map((repo) => (
            <RepoItem
              repo={repo}
              activeTool={props.tool}
              emphasizeStars={props.view === 'popular'}
              query={query}
            />
          ))}
        </ul>
        <p class="empty" data-empty hidden={props.repos.length > 0}>
          {filtered ? 'No repositories match this filter.' : 'Nothing here yet — register a repo above.'}
        </p>
      </section>
      <script dangerouslySetInnerHTML={{ __html: FILTER_SCRIPT }} />
    </Layout>
  );
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const DetailPage = (props: { repo: RepoWithTools; shareUrl: string }) => {
  const repo = props.repo;
  const full = `${repo.owner}/${repo.name}`;
  return (
    <Layout title={`${full} — dotfiler`}>
      <nav class="crumb">
        <a href="/">
          <span class="dot">.</span>dotfiler
        </a>{' '}
        / {full}
      </nav>
      <header class="detail-header">
        <div class="detail-head">
          <div class="detail-title-wrap">
            <h1 class="detail-title">{full}</h1>
          </div>
          <div class="detail-links">
            <a class="github-link" href={repo.html_url} rel="noopener noreferrer" target="_blank">
              View on GitHub ↗
            </a>
            <a class="share-link" href={props.shareUrl} rel="noopener noreferrer" target="_blank">
              Share on X ↗
            </a>
          </div>
        </div>
        {repo.description !== null && repo.description !== '' && <p class="detail-desc">{repo.description}</p>}
        <div class="detail-stats">
          <span>
            {formatStars(repo.stars)} ★ ({repo.stars.toLocaleString()})
          </span>
          <span>{plural(repo.tools.length, 'tool', 'tools')} detected</span>
          <span>scanned {formatDate(repo.scanned_at)}</span>
        </div>
      </header>

      <section aria-label="Detected tools">
        <h2 class="section-label section-label-spaced">Detected tools</h2>
        {repo.tools.length === 0 ? (
          <p class="empty">No known tools detected in this tree.</p>
        ) : (
          <ul class="tool-rows">
            {repo.tools.map((tool) => (
              <li>
                <Tag
                  slug={tool.tool_slug}
                  title={toolName(tool.tool_slug)}
                  href={indexHref({ view: 'popular', q: '', tool: tool.tool_slug, category: '' })}
                />
                <span class="matched-path">{tool.matched_path}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dl class="meta-grid">
        <dt class="meta-key">Branch</dt>
        <dd class="meta-val">{repo.default_branch}</dd>
        <dt class="meta-key">Registered</dt>
        <dd class="meta-val">{formatDate(repo.registered_at)}</dd>
        <dt class="meta-key">Last scanned</dt>
        <dd class="meta-val">{formatDate(repo.scanned_at)}</dd>
      </dl>

      <div class="detail-actions">
        <form method="post" action="/repos">
          <input type="hidden" name="repo" value={full} />
          <button type="submit">Re-scan</button>
        </form>
        <a class="btn btn-ghost" href="/">
          Back to index
        </a>
      </div>
    </Layout>
  );
};

export const NotFoundPage = (props: { message: string }) => (
  <Layout title="Not found — dotfiler">
    <nav class="crumb">
      <a href="/">
        <span class="dot">.</span>dotfiler
      </a>
    </nav>
    <h1 class="detail-title detail-title-spaced">Not found</h1>
    <p class="detail-desc">{props.message}</p>
    <p class="back-link">
      <a class="btn btn-ghost" href="/">
        Back to index
      </a>
    </p>
  </Layout>
);
