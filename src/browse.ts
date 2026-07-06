import type { BrowseView, RepoWithTools } from './db';
import { CATEGORY_ORDER, TOOL_BY_SLUG, type ToolCategory } from './registry';

export function parseView(raw: string | undefined): BrowseView {
  return raw === 'explore' ? 'explore' : 'popular';
}

export function categoryCounts(repos: RepoWithTools[]): Map<ToolCategory, number> {
  const counts = new Map<ToolCategory, number>();
  for (const repo of repos) {
    const seen = new Set<ToolCategory>();
    for (const tool of repo.tools) {
      const category = TOOL_BY_SLUG.get(tool.tool_slug)?.category;
      if (category !== undefined) seen.add(category);
    }
    for (const category of seen) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return counts;
}

export type IndexQuery = {
  view: BrowseView;
  q: string;
  tool: string;
  category: ToolCategory | '';
};

export function indexHref(query: IndexQuery, overrides: Partial<IndexQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.view === 'explore') params.set('view', 'explore');
  if (merged.q !== '') params.set('q', merged.q);
  if (merged.tool !== '') params.set('tool', merged.tool);
  if (merged.category !== '') params.set('category', merged.category);
  const serialized = params.toString();
  return serialized === '' ? '/' : `/?${serialized}`;
}

export function surpriseHref(query: IndexQuery): string {
  const params = new URLSearchParams();
  if (query.q !== '') params.set('q', query.q);
  if (query.tool !== '') params.set('tool', query.tool);
  if (query.category !== '') params.set('category', query.category);
  const serialized = params.toString();
  return serialized === '' ? '/surprise' : `/surprise?${serialized}`;
}

export function sortedCategories(counts: Map<ToolCategory, number>): [ToolCategory, number][] {
  return CATEGORY_ORDER.flatMap((category) => {
    const count = counts.get(category);
    return count === undefined ? [] : [[category, count] as const];
  });
}
