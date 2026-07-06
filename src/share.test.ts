import { describe, expect, it } from 'vitest';
import { repoShareTweet, xIntentUrl } from './share';
import type { RepoWithTools } from './db';

const repo = (tools: string[]): RepoWithTools => ({
  id: 1,
  owner: 'sorafujitani',
  name: 'dotfiles',
  description: null,
  stars: 12,
  default_branch: 'main',
  html_url: 'https://github.com/sorafujitani/dotfiles',
  registered_at: '2026-07-06T00:00:00.000Z',
  scanned_at: '2026-07-06T00:00:00.000Z',
  tools: tools.map((slug) => ({ repo_id: 1, tool_slug: slug, matched_path: `.${slug}` })),
});

describe('repoShareTweet', () => {
  it('separates hashtags and the GitHub URL with blank lines', () => {
    expect(repoShareTweet(repo(['git', 'neovim']))).toBe(
      'sorafujitani/dotfiles on dotfiler\n\n#dotfiles #dotfiler\n\nhttps://github.com/sorafujitani/dotfiles',
    );
  });
});

describe('xIntentUrl', () => {
  it('encodes the full tweet in a single text param', () => {
    const href = xIntentUrl('sorafujitani/dotfiles on dotfiler\n\n#dotfiles #dotfiler\n\nhttps://github.com/sorafujitani/dotfiles');
    expect(href).toBe(
      'https://twitter.com/intent/tweet?text=sorafujitani%2Fdotfiles+on+dotfiler%0A%0A%23dotfiles+%23dotfiler%0A%0Ahttps%3A%2F%2Fgithub.com%2Fsorafujitani%2Fdotfiles',
    );
  });
});
