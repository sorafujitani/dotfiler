import type { RepoWithTools } from './db';

const DEFAULT_HASHTAGS = ['dotfiles', 'dotfiler'] as const;

export function repoPageUrl(base: string, owner: string, name: string): string {
  return new URL(`/repos/${owner}/${name}`, base).toString();
}

export function repoShareTweet(repo: RepoWithTools, pageUrl: string): { text: string; url: string } {
  const full = `${repo.owner}/${repo.name}`;
  return { text: `${full} on dotfiler`, url: pageUrl };
}

export function xIntentUrl(input: { text: string; url: string; hashtags?: readonly string[] }): string {
  const params = new URLSearchParams({ text: input.text, url: input.url });
  const tags = input.hashtags ?? DEFAULT_HASHTAGS;
  if (tags.length > 0) params.set('hashtags', tags.join(','));
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
