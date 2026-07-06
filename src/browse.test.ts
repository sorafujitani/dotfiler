import { describe, expect, it } from 'vitest';
import { categoryCounts, indexHref, parseView, surpriseHref } from './browse';
import type { RepoWithTools } from './db';

const repo = (tools: string[]): RepoWithTools => ({
  id: 1,
  owner: 'a',
  name: 'b',
  description: null,
  stars: 0,
  default_branch: 'main',
  html_url: 'https://github.com/a/b',
  registered_at: '2026-07-06T00:00:00.000Z',
  scanned_at: '2026-07-06T00:00:00.000Z',
  tools: tools.map((slug) => ({ repo_id: 1, tool_slug: slug, matched_path: slug })),
});

describe('parseView', () => {
  it('defaults to popular', () => {
    expect(parseView(undefined)).toBe('popular');
    expect(parseView('nope')).toBe('popular');
  });

  it('accepts explore', () => {
    expect(parseView('explore')).toBe('explore');
  });
});

describe('categoryCounts', () => {
  it('counts each category once per repo', () => {
    const counts = categoryCounts([repo(['neovim', 'vim']), repo(['zsh'])]);
    expect(counts.get('editor')).toBe(1);
    expect(counts.get('shell')).toBe(1);
  });
});

describe('indexHref', () => {
  it('omits popular as the default view', () => {
    expect(indexHref({ view: 'popular', q: '', tool: '', category: '' })).toBe('/');
  });

  it('preserves explore filters', () => {
    expect(indexHref({ view: 'explore', q: 'nix', tool: '', category: 'package' })).toBe(
      '/?view=explore&q=nix&category=package',
    );
  });
});

describe('surpriseHref', () => {
  it('builds a surprise path with filters', () => {
    expect(surpriseHref({ view: 'explore', q: '', tool: '', category: 'editor' })).toBe('/surprise?category=editor');
  });
});
