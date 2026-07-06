import type { DetectedTool } from './detect';

export type RepoRow = {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  default_branch: string;
  html_url: string;
  registered_at: string;
  scanned_at: string;
};

export type RepoToolRow = {
  repo_id: number;
  tool_slug: string;
  matched_path: string;
};

export type RepoWithTools = RepoRow & { tools: RepoToolRow[] };

export type UpsertRepoInput = {
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  htmlUrl: string;
  scannedAt: string;
};

export async function upsertRepo(db: D1Database, input: UpsertRepoInput): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO repos (owner, name, description, stars, default_branch, html_url, registered_at, scanned_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT (owner, name) DO UPDATE SET
         description = excluded.description,
         stars = excluded.stars,
         default_branch = excluded.default_branch,
         html_url = excluded.html_url,
         scanned_at = excluded.scanned_at
       RETURNING id`,
    )
    .bind(input.owner, input.name, input.description, input.stars, input.defaultBranch, input.htmlUrl, input.scannedAt)
    .first<{ id: number }>();
  if (row === null) throw new Error('upsertRepo returned no row');
  return row.id;
}

export async function replaceTools(db: D1Database, repoId: number, tools: DetectedTool[]): Promise<void> {
  const statements = [db.prepare('DELETE FROM repo_tools WHERE repo_id = ?1').bind(repoId)];
  for (const tool of tools) {
    statements.push(
      db
        .prepare('INSERT INTO repo_tools (repo_id, tool_slug, matched_path) VALUES (?1, ?2, ?3)')
        .bind(repoId, tool.slug, tool.matchedPath),
    );
  }
  await db.batch(statements);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type BrowseView = 'popular' | 'explore';

export type ListReposFilter = {
  q?: string;
  // Registry slugs whose slug/name matched q; resolved by the caller so db stays registry-free.
  qToolSlugs?: string[];
  tool?: string;
  categoryToolSlugs?: string[];
  view?: BrowseView;
};

type ListWhere = { whereSql: string; binds: (string | number)[] };

function buildListWhere(filter: ListReposFilter): ListWhere {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  const bind = (value: string | number): string => {
    binds.push(value);
    return `?${binds.length}`;
  };

  if (filter.tool !== undefined && filter.tool !== '') {
    where.push(`EXISTS (SELECT 1 FROM repo_tools t WHERE t.repo_id = repos.id AND t.tool_slug = ${bind(filter.tool)})`);
  }
  const categorySlugs = filter.categoryToolSlugs ?? [];
  if (categorySlugs.length > 0) {
    const placeholders = categorySlugs.map((slug) => bind(slug)).join(', ');
    where.push(`EXISTS (SELECT 1 FROM repo_tools t WHERE t.repo_id = repos.id AND t.tool_slug IN (${placeholders}))`);
  }
  if (filter.q !== undefined && filter.q !== '') {
    const like = `%${escapeLike(filter.q.toLowerCase())}%`;
    const clauses = [
      `lower(owner) LIKE ${bind(like)} ESCAPE '\\'`,
      `lower(name) LIKE ${bind(like)} ESCAPE '\\'`,
    ];
    clauses.push(
      `EXISTS (SELECT 1 FROM repo_tools t WHERE t.repo_id = repos.id AND t.tool_slug LIKE ${bind(like)} ESCAPE '\\')`,
    );
    const slugs = filter.qToolSlugs ?? [];
    if (slugs.length > 0) {
      const placeholders = slugs.map((slug) => bind(slug)).join(', ');
      clauses.push(`EXISTS (SELECT 1 FROM repo_tools t WHERE t.repo_id = repos.id AND t.tool_slug IN (${placeholders}))`);
    }
    where.push(`(${clauses.join(' OR ')})`);
  }

  return { whereSql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', binds };
}

function listOrder(view: BrowseView | undefined): string {
  return view === 'explore' ? 'RANDOM()' : 'stars DESC, owner, name';
}

async function attachTools(db: D1Database, repos: RepoRow[]): Promise<RepoWithTools[]> {
  if (repos.length === 0) return [];
  const placeholders = repos.map((_, i) => `?${i + 1}`).join(', ');
  const { results } = await db
    .prepare(`SELECT repo_id, tool_slug, matched_path FROM repo_tools WHERE repo_id IN (${placeholders}) ORDER BY tool_slug`)
    .bind(...repos.map((repo) => repo.id))
    .all<RepoToolRow>();
  const byRepo = new Map<number, RepoToolRow[]>();
  for (const row of results) {
    const list = byRepo.get(row.repo_id);
    if (list === undefined) byRepo.set(row.repo_id, [row]);
    else list.push(row);
  }
  return repos.map((repo) => ({ ...repo, tools: byRepo.get(repo.id) ?? [] }));
}

export async function listRepos(db: D1Database, filter: ListReposFilter): Promise<RepoWithTools[]> {
  const { whereSql, binds } = buildListWhere(filter);
  const { results } = await db
    .prepare(`SELECT * FROM repos ${whereSql} ORDER BY ${listOrder(filter.view)}`)
    .bind(...binds)
    .all<RepoRow>();
  return attachTools(db, results);
}

export async function pickRandomRepo(db: D1Database, filter: ListReposFilter): Promise<RepoWithTools | null> {
  const { whereSql, binds } = buildListWhere(filter);
  const repo = await db
    .prepare(`SELECT * FROM repos ${whereSql} ORDER BY RANDOM() LIMIT 1`)
    .bind(...binds)
    .first<RepoRow>();
  if (repo === null) return null;
  const withTools = await attachTools(db, [repo]);
  return withTools[0] ?? null;
}

export async function toolCounts(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare('SELECT tool_slug, COUNT(*) AS count FROM repo_tools GROUP BY tool_slug')
    .all<{ tool_slug: string; count: number }>();
  return new Map(results.map((row) => [row.tool_slug, row.count]));
}

export async function getRepoWithTools(db: D1Database, owner: string, name: string): Promise<RepoWithTools | null> {
  const repo = await db
    .prepare('SELECT * FROM repos WHERE owner = ?1 AND name = ?2')
    .bind(owner, name)
    .first<RepoRow>();
  if (repo === null) return null;
  const withTools = await attachTools(db, [repo]);
  return withTools[0] ?? null;
}
