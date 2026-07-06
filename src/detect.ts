import { normalizePath } from './normalize';
import { CLAIMED_CONFIG_DIRS, TOOL_REGISTRY } from './registry';

export type DetectedTool = {
  slug: string;
  matchedPath: string;
};

const FALLBACK_SLUG = /^[a-z0-9][a-z0-9._-]{0,40}$/;

function fallbackSlug(segments: string[]): string | null {
  for (let i = 0; i < segments.length - 2; i++) {
    if (segments[i] !== '.config') continue;
    const name = segments[i + 1];
    if (name === undefined || CLAIMED_CONFIG_DIRS.has(name) || !FALLBACK_SLUG.test(name)) continue;
    return name;
  }
  return null;
}

export function detectTools(paths: string[]): DetectedTool[] {
  const normalized = paths.map((path) => normalizePath(path).toLowerCase());
  const detected: DetectedTool[] = [];
  const claimed = new Set<string>();
  for (const tool of TOOL_REGISTRY) {
    for (let i = 0; i < paths.length; i++) {
      const original = paths[i];
      const lower = normalized[i];
      if (original !== undefined && lower !== undefined && tool.match(lower)) {
        detected.push({ slug: tool.slug, matchedPath: original });
        claimed.add(tool.slug);
        break;
      }
    }
  }
  for (let i = 0; i < paths.length; i++) {
    const original = paths[i];
    const lower = normalized[i];
    if (original === undefined || lower === undefined) continue;
    const slug = fallbackSlug(lower.split('/'));
    if (slug === null || claimed.has(slug)) continue;
    detected.push({ slug, matchedPath: original });
    claimed.add(slug);
  }
  return detected;
}
