import type { RepoWithTools } from './db';

const DEFAULT_HASHTAGS = ['dotfiles', 'dotfiler'] as const;

export function repoShareTweet(repo: RepoWithTools): string {
  const full = `${repo.owner}/${repo.name}`;
  const tags = DEFAULT_HASHTAGS.map((tag) => `#${tag}`).join(' ');
  return `${full} on dotfiler\n\n${tags}\n\n${repo.html_url}`;
}

export function xIntentUrl(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
