import { Hono } from 'hono';
import { parseView } from './browse';
import { getRepoWithTools, listRepos, pickRandomRepo, replaceTools, toolCounts, upsertRepo, type RepoWithTools } from './db';
import { detectTools } from './detect';
import { fetchRepo, parseRepoInput, type FetchFailureReason, type RepoRef } from './github';
import { parseCategory, slugsInCategory, slugsMatchingQuery } from './registry';
import { repoPageUrl, repoShareTweet, xIntentUrl } from './share';
import { DetailPage, IndexPage, NotFoundPage } from './views';

type Bindings = {
  DB: D1Database;
  GITHUB_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function listFilter(q: string, tool: string, view: ReturnType<typeof parseView>, category: ReturnType<typeof parseCategory>) {
  return {
    q,
    tool,
    view,
    qToolSlugs: slugsMatchingQuery(q),
    categoryToolSlugs: category === '' ? undefined : slugsInCategory(category),
  };
}

async function indexProps(
  db: D1Database,
  q: string,
  tool: string,
  view: ReturnType<typeof parseView>,
  category: ReturnType<typeof parseCategory>,
) {
  const filter = listFilter(q, tool, view, category);
  const [repos, counts, allRepos] = await Promise.all([
    listRepos(db, filter),
    toolCounts(db),
    view === 'explore' ? listRepos(db, { view: 'popular' }) : Promise.resolve(null),
  ]);
  return { repos, counts, q, tool, view, category, allRepos };
}

function shareUrlForRepo(base: string, repo: RepoWithTools): string {
  const pageUrl = repoPageUrl(base, repo.owner, repo.name);
  return xIntentUrl(repoShareTweet(repo, pageUrl));
}

app.get('/', async (c) => {
  const q = c.req.query('q')?.trim() ?? '';
  const tool = c.req.query('tool')?.trim() ?? '';
  const view = parseView(c.req.query('view'));
  const category = parseCategory(c.req.query('category'));
  const scanned = c.req.query('scanned');
  const notice =
    scanned === undefined
      ? undefined
      : c.req.query('truncated') === '1'
        ? `Registered ${scanned}. The tree was truncated by GitHub, so detection ran on a partial file list.`
        : `Registered ${scanned}.`;
  const props = await indexProps(c.env.DB, q, tool, view, category);

  let shareUrl: string | undefined;
  if (scanned !== undefined) {
    const slash = scanned.indexOf('/');
    if (slash > 0) {
      const owner = scanned.slice(0, slash);
      const name = scanned.slice(slash + 1);
      const repo = await getRepoWithTools(c.env.DB, owner, name);
      if (repo !== null) shareUrl = shareUrlForRepo(c.req.url, repo);
    }
  }

  return c.html(<IndexPage {...props} notice={notice} shareUrl={shareUrl} />);
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
    const props = await indexProps(c.env.DB, '', '', 'popular', '');
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

app.get('/surprise', async (c) => {
  const q = c.req.query('q')?.trim() ?? '';
  const tool = c.req.query('tool')?.trim() ?? '';
  const category = parseCategory(c.req.query('category'));
  const repo = await pickRandomRepo(c.env.DB, listFilter(q, tool, 'explore', category));
  if (repo === null) return c.redirect('/', 302);
  return c.redirect(`/repos/${repo.owner}/${repo.name}`, 302);
});

app.get('/repos/:owner/:name', async (c) => {
  const repo = await getRepoWithTools(c.env.DB, c.req.param('owner'), c.req.param('name'));
  if (repo === null) {
    return c.html(<NotFoundPage message="This repository is not registered here." />, 404);
  }
  const shareUrl = shareUrlForRepo(c.req.url, repo);
  return c.html(<DetailPage repo={repo} shareUrl={shareUrl} />);
});

app.notFound((c) => c.html(<NotFoundPage message="No such page." />, 404));

export default app;
