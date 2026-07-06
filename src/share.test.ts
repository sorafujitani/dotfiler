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
  it('puts hashtags in text and uses the GitHub URL', () => {
    const { text, url } = repoShareTweet(repo(['git', 'neovim']));
    expect(text).toBe('sorafujitani/dotfiles on dotfiler\n\n#dotfiles #dotfiler');
    expect(url).toBe('https://github.com/sorafujitani/dotfiles');
  });
});

describe('xIntentUrl', () => {
  it('builds a twitter intent URL without a separate hashtags param', () => {
    const href = xIntentUrl({
      text: 'sorafujitani/dotfiles on dotfiler\n\n#dotfiles #dotfiler',
      url: 'https://github.com/sorafujitani/dotfiles',
    });
    expect(href).toBe(
      'https://twitter.com/intent/tweet?text=sorafujitani%2Fdotfiles+on+dotfiler%0A%0A%23dotfiles+%23dotfiler&url=https%3A%2F%2Fgithub.com%2Fsorafujitani%2Fdotfiles',
    );
  });
});
