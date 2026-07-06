import { Hono } from 'hono';
import { getRepoWithTools, listRepos, replaceTools, toolCounts, upsertRepo } from './db';
import { detectTools } from './detect';
import { fetchRepo, parseRepoInput, type FetchFailureReason, type RepoRef } from './github';
import { slugsMatchingQuery } from './registry';
import { DetailPage, IndexPage, NotFoundPage } from './views';

type Bindings = {
  DB: D1Database;
  GITHUB_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

async function indexProps(db: D1Database, q: string, tool: string) {
  const [repos, counts] = await Promise.all([
    listRepos(db, { q, tool, qToolSlugs: slugsMatchingQuery(q) }),
    toolCounts(db),
  ]);
  return { repos, counts, q, tool };
}

app.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? '';
  const tool = c.req.query('tool')?.trim() ?? '';
  const scanned = c.req.query('scanned');
  const notice =
    scanned === undefined
      ? undefined
      : c.req.query('truncated') === '1'
        ? `Registered ${scanned}. The tree was truncated by GitHub, so detection ran on a partial file list.`
        : `Registered ${scanned}.`;
  const props = await indexProps(c.env.DB, q, tool);
  return c.html(<IndexPage {...props} notice={notice} />);
});

const FAILURE_MESSAGES: Record<FetchFailureReason, { status: 400 | 404 | 429 | 502; message: string }> = {
  invalid_input: { status: 400, message: 'Enter a repository as owner/repo or a github.com URL.' },
  not_found: { status: 404, message: 'Repository not found on GitHub. Check the owner and name.' },
  rate_limited: {
    status: 429,
    message: 'GitHub rate limit reached. Try again in a few minutes, or configure GITHUB_TOKEN.',
  },
  upstream_error: { status: 502, message: 'GitHub returned an unexpected response. Try again shortly.' },
};

app.post('/repos', async (c) => {
  const body = await c.req.parseBody();
  const raw = typeof body['repo'] === 'string' ? body['repo'] : '';

  const fail = async (reason: FetchFailureReason, formValue: string) => {
    const { status, message } = FAILURE_MESSAGES[reason];
    const props = await indexProps(c.env.DB, '', '');
    return c.html(<IndexPage {...props} error={message} formValue={formValue} />, status);
  };

  const ref: RepoRef | null = parseRepoInput(raw);
  if (ref === null) return fail('invalid_input', raw);

  const result = await fetchRepo(ref, c.env.GITHUB_TOKEN);
  if (!result.ok) return fail(result.reason, raw);

  const detected = detectTools(result.paths);
  const repoId = await upsertRepo(c.env.DB, {
    owner: result.meta.owner,
    name: result.meta.name,
    description: result.meta.description,
    stars: result.meta.stars,
    defaultBranch: result.meta.defaultBranch,
    htmlUrl: result.meta.htmlUrl,
    scannedAt: new Date().toISOString(),
  });
  await replaceTools(c.env.DB, repoId, detected);

  const params = new URLSearchParams({ scanned: `${result.meta.owner}/${result.meta.name}` });
  if (result.truncated) params.set('truncated', '1');
  return c.redirect(`/?${params.toString()}`, 303);
});

app.get('/repos/:owner/:name', async (c) => {
  const repo = await getRepoWithTools(c.env.DB, c.req.param('owner'), c.req.param('name'));
  if (repo === null) {
    return c.html(<NotFoundPage message="This repository is not registered here." />, 404);
  }
  return c.html(<DetailPage repo={repo} />);
});

app.notFound((c) => c.html(<NotFoundPage message="No such page." />, 404));

export default app;
