import { describe, expect, it } from 'vitest';
import { normalizePath } from './normalize';

describe('normalizePath', () => {
  it('maps a leading dot_ to a dot', () => {
    expect(normalizePath('dot_zshrc')).toBe('.zshrc');
  });

  it('normalizes every segment of a path', () => {
    expect(normalizePath('dot_config/ghostty/config')).toBe('.config/ghostty/config');
  });

  it('strips attribute prefixes before mapping dot_', () => {
    expect(normalizePath('private_dot_config/herdr/config.toml')).toBe('.config/herdr/config.toml');
  });

  it('strips attribute prefixes on non-dot segments', () => {
    expect(normalizePath('dot_config/wezterm/executable_wlay')).toBe('.config/wezterm/wlay');
  });

  it('strips stacked attribute prefixes', () => {
    expect(normalizePath('private_readonly_dot_ssh/config')).toBe('.ssh/config');
  });

  it('strips yadm alternate suffixes', () => {
    expect(normalizePath('.zshrc##os.Darwin')).toBe('.zshrc');
    expect(normalizePath('.config/kitty/kitty.conf##hostname.mac')).toBe('.config/kitty/kitty.conf');
  });

  it('strips holman-style .symlink suffixes', () => {
    expect(normalizePath('git/gitconfig.symlink')).toBe('git/gitconfig');
    expect(normalizePath('tmux/tmux.conf.symlink')).toBe('tmux/tmux.conf');
  });

  it('leaves non-chezmoi paths unchanged', () => {
    expect(normalizePath('.config/nvim/init.lua')).toBe('.config/nvim/init.lua');
    expect(normalizePath('README.md')).toBe('README.md');
    expect(normalizePath('src/main.rs')).toBe('src/main.rs');
  });
});
