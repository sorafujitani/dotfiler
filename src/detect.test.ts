import { describe, expect, it } from 'vitest';
import { detectTools } from './detect';

function slugs(paths: string[]): string[] {
  return detectTools(paths).map((tool) => tool.slug);
}

describe('detectTools', () => {
  it('detects neovim via a .config/nvim/ directory', () => {
    expect(slugs(['.config/nvim/init.lua'])).toContain('neovim');
  });

  it('detects dotted basenames anywhere in the tree', () => {
    expect(slugs(['.zshrc'])).toContain('zsh');
    expect(slugs(['shell/.zshrc'])).toContain('zsh');
  });

  it('detects Brewfile case-insensitively', () => {
    expect(slugs(['Brewfile'])).toContain('homebrew');
    expect(slugs(['homebrew/Brewfile'])).toContain('homebrew');
  });

  it('returns nothing for unrelated paths', () => {
    expect(slugs(['README.md', 'src/main.rs', 'docs/notes.txt'])).toEqual([]);
  });

  it('reports the first matched path as evidence, preserving case', () => {
    const detected = detectTools(['README.md', 'Shell/.ZSHRC', 'other/.zshrc']);
    expect(detected).toContainEqual({ slug: 'zsh', matchedPath: 'Shell/.ZSHRC' });
  });

  it('does not treat a bare .config/nvim file entry as a directory match', () => {
    expect(slugs(['.config/nvim'])).toEqual([]);
  });

  it('detects each tool at most once', () => {
    const detected = detectTools(['.zshrc', '.zshenv', '.config/zsh/aliases.zsh']);
    expect(detected.filter((tool) => tool.slug === 'zsh')).toHaveLength(1);
  });

  it('does not misread nested init.lua files as neovim', () => {
    expect(slugs(['.hammerspoon/init.lua'])).not.toContain('neovim');
    expect(slugs(['init.lua'])).toContain('neovim');
    expect(slugs(['nvim/init.lua'])).toContain('neovim');
  });

  it('detects multiple tools from one tree', () => {
    const found = slugs(['.config/nvim/init.lua', '.tmux.conf', 'Brewfile', '.config/starship.toml']);
    expect(found).toEqual(expect.arrayContaining(['neovim', 'tmux', 'homebrew', 'starship']));
  });
});

describe('detectTools on chezmoi-encoded trees', () => {
  const identityTree = [
    'dot_zshrc',
    'dot_config/ghostty/config',
    'private_dot_config/herdr/config.toml',
    'dot_config/zeno/config.yml',
    'dot_config/nvim/init.lua',
  ];

  it('detects zsh from dot_zshrc', () => {
    expect(slugs(identityTree)).toContain('zsh');
  });

  it('detects ghostty through normalization via the registry', () => {
    expect(slugs(identityTree)).toContain('ghostty');
  });

  it('keeps the original chezmoi path as evidence', () => {
    expect(detectTools(identityTree)).toContainEqual({ slug: 'ghostty', matchedPath: 'dot_config/ghostty/config' });
  });

  it('detects unregistered .config tools as fallback slugs', () => {
    const detected = detectTools(identityTree);
    expect(detected).toContainEqual({ slug: 'herdr', matchedPath: 'private_dot_config/herdr/config.toml' });
    expect(detected).toContainEqual({ slug: 'zeno', matchedPath: 'dot_config/zeno/config.yml' });
  });

  it('does not duplicate registry detections with fallback slugs', () => {
    const detected = detectTools(identityTree);
    expect(detected.filter((tool) => tool.slug === 'neovim')).toHaveLength(1);
    expect(detected.map((tool) => tool.slug)).not.toContain('nvim');
  });

  it('does not emit a fallback for a bare .config/<name> blob', () => {
    expect(slugs(['.config/herdr'])).toEqual([]);
  });

  it('skips fallback slugs that fail sanitization', () => {
    expect(slugs(['.config/-bad/config', '.config/has space/config'])).toEqual([]);
  });

  it('dedupes fallback slugs and keeps the first evidence', () => {
    const detected = detectTools(['.config/herdr/a.toml', '.config/herdr/b.toml']);
    expect(detected).toEqual([{ slug: 'herdr', matchedPath: '.config/herdr/a.toml' }]);
  });
});
