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
  it('uses repo name without tool details', () => {
    const { text, url } = repoShareTweet(repo(['git', 'neovim']), 'https://dotfiler.example/repos/sorafujitani/dotfiles');
    expect(text).toBe('sorafujitani/dotfiles on dotfiler');
    expect(url).toBe('https://dotfiler.example/repos/sorafujitani/dotfiles');
  });
});

describe('xIntentUrl', () => {
  it('builds a twitter intent URL with default hashtags', () => {
    const href = xIntentUrl({ text: 'hello', url: 'https://example.com/repo' });
    expect(href).toBe(
      'https://twitter.com/intent/tweet?text=hello&url=https%3A%2F%2Fexample.com%2Frepo&hashtags=dotfiles%2Cdotfiler',
    );
  });
});
