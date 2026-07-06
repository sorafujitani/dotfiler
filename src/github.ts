export type RepoRef = { owner: string; name: string };

export type RepoMeta = {
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  htmlUrl: string;
};

export type FetchFailureReason = 'invalid_input' | 'not_found' | 'rate_limited' | 'upstream_error';

export type FetchRepoResult =
  | { ok: true; meta: RepoMeta; paths: string[]; truncated: boolean }
  | { ok: false; reason: FetchFailureReason };

const OWNER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const NAME_RE = /^[\w.-]{1,100}$/;

export function parseRepoInput(input: string): RepoRef | null {
  let value = input.trim();
  if (value === '') return null;
  value = value.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  value = value.replace(/^git@github\.com:/i, '');
  const segments = value.split('/').filter((segment) => segment !== '');
  const [owner, rawName] = segments;
  if (owner === undefined || rawName === undefined) return null;
  const name = rawName.replace(/\.git$/i, '');
  if (!OWNER_RE.test(owner) || !NAME_RE.test(name)) return null;
  return { owner, name };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseMeta(json: unknown): RepoMeta | null {
  if (!isRecord(json)) return null;
  const ownerField = json['owner'];
  if (!isRecord(ownerField)) return null;
  const owner = readString(ownerField, 'login');
  const name = readString(json, 'name');
  const stars = readNumber(json, 'stargazers_count');
  const defaultBranch = readString(json, 'default_branch');
  const htmlUrl = readString(json, 'html_url');
  if (owner === null || name === null || stars === null || defaultBranch === null || htmlUrl === null) return null;
  const description = readString(json, 'description');
  return { owner, name, description, stars, defaultBranch, htmlUrl };
}

function parseTree(json: unknown): { paths: string[]; truncated: boolean } | null {
  if (!isRecord(json)) return null;
  const tree = json['tree'];
  if (!Array.isArray(tree)) return null;
  const paths: string[] = [];
  for (const entry of tree) {
    if (!isRecord(entry)) return null;
    const path = readString(entry, 'path');
    const type = readString(entry, 'type');
    if (path === null || type === null) return null;
    if (type === 'blob') paths.push(path);
  }
  return { paths, truncated: json['truncated'] === true };
}

function headers(token: string | undefined): Record<string, string> {
  const base: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'dotfiler (github.com/sorafujitani/dotfiler)',
  };
  if (token !== undefined && token !== '') base['authorization'] = `Bearer ${token}`;
  return base;
}

function failureFor(response: Response): FetchFailureReason {
  if (response.status === 404) return 'not_found';
  if (response.status === 403 || response.status === 429) return 'rate_limited';
  return 'upstream_error';
}

async function getJson(
  url: string,
  token: string | undefined,
): Promise<{ ok: true; json: unknown } | { ok: false; reason: FetchFailureReason; status: number }> {
  let response: Response;
  try {
    response = await fetch(url, { headers: headers(token) });
  } catch {
    return { ok: false, reason: 'upstream_error', status: 0 };
  }
  if (!response.ok) return { ok: false, reason: failureFor(response), status: response.status };
  try {
    return { ok: true, json: await response.json() };
  } catch {
    return { ok: false, reason: 'upstream_error', status: response.status };
  }
}

export async function fetchRepo(ref: RepoRef, token?: string): Promise<FetchRepoResult> {
  const base = `https://api.github.com/repos/${ref.owner}/${ref.name}`;
  const metaResult = await getJson(base, token);
  if (!metaResult.ok) return { ok: false, reason: metaResult.reason };
  const meta = parseMeta(metaResult.json);
  if (meta === null) return { ok: false, reason: 'upstream_error' };

  const treeUrl = `${base}/git/trees/${encodeURIComponent(meta.defaultBranch)}?recursive=1`;
  const treeResult = await getJson(treeUrl, token);
  if (!treeResult.ok) {
    // 404/409 here means an empty repository, not a missing one.
    if (treeResult.status === 404 || treeResult.status === 409) {
      return { ok: true, meta, paths: [], truncated: false };
    }
    return { ok: false, reason: treeResult.reason };
  }
  const tree = parseTree(treeResult.json);
  if (tree === null) return { ok: false, reason: 'upstream_error' };
  return { ok: true, meta, paths: tree.paths, truncated: tree.truncated };
}
