import type { RepoWithTools } from './db';

const DEFAULT_HASHTAGS = ['dotfiles', 'dotfiler'] as const;

export function repoShareTweet(repo: RepoWithTools): { text: string; url: string } {
  const full = `${repo.owner}/${repo.name}`;
  const tags = DEFAULT_HASHTAGS.map((tag) => `#${tag}`).join(' ');
  return {
    text: `${full} on dotfiler\n\n${tags}`,
    url: repo.html_url,
  };
}

export function xIntentUrl(input: { text: string; url: string }): string {
  const params = new URLSearchParams({ text: input.text, url: input.url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
