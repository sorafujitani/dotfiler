export type ToolCategory =
  | 'editor'
  | 'shell'
  | 'terminal'
  | 'multiplexer'
  | 'vcs'
  | 'wm'
  | 'launcher'
  | 'prompt'
  | 'package'
  | 'runtime'
  | 'cli'
  | 'other';

// Declarative patterns compiled into match functions; paths are repo-relative and lowercased.
type Pattern =
  | { kind: 'basename'; value: string }
  | { kind: 'rootFile'; value: string }
  | { kind: 'configDir'; value: string }
  | { kind: 'dir'; value: string }
  | { kind: 'suffix'; value: string };

export type ToolDef = {
  slug: string;
  name: string;
  category: ToolCategory;
  match: (path: string) => boolean;
};

const basename = (value: string): Pattern => ({ kind: 'basename', value });
const rootFile = (value: string): Pattern => ({ kind: 'rootFile', value });
const configDir = (value: string): Pattern => ({ kind: 'configDir', value });
const dir = (value: string): Pattern => ({ kind: 'dir', value });
const suffix = (value: string): Pattern => ({ kind: 'suffix', value });

function matchesPattern(pattern: Pattern, segments: string[]): boolean {
  const last = segments[segments.length - 1];
  if (last === undefined) return false;
  switch (pattern.kind) {
    case 'basename':
      return last === pattern.value;
    case 'rootFile':
      return segments.length === 1 && last === pattern.value;
    case 'suffix':
      return last.endsWith(pattern.value);
    case 'dir':
      return segments.slice(0, -1).includes(pattern.value);
    case 'configDir':
      return segments.some(
        (segment, i) => segment === '.config' && segments[i + 1] === pattern.value && i + 1 < segments.length - 1,
      );
  }
}

function compile(patterns: Pattern[]): (path: string) => boolean {
  return (path) => {
    const segments = path.split('/');
    return patterns.some((pattern) => matchesPattern(pattern, segments));
  };
}

type ToolSpec = {
  slug: string;
  name: string;
  category: ToolCategory;
  patterns: Pattern[];
};

const SPECS: ToolSpec[] = [
  // init.lua only at repo root: nested ones belong to other Lua-configured tools (.hammerspoon/init.lua).
  { slug: 'neovim', name: 'Neovim', category: 'editor', patterns: [configDir('nvim'), dir('nvim'), rootFile('init.lua')] },
  { slug: 'vim', name: 'Vim', category: 'editor', patterns: [basename('.vimrc'), basename('vimrc'), dir('.vim'), suffix('.vim')] },
  { slug: 'emacs', name: 'Emacs', category: 'editor', patterns: [basename('.emacs'), dir('.emacs.d'), configDir('emacs'), dir('.doom.d')] },
  { slug: 'helix', name: 'Helix', category: 'editor', patterns: [configDir('helix')] },
  { slug: 'vscode', name: 'VS Code', category: 'editor', patterns: [dir('vscode'), dir('.vscode')] },
  { slug: 'zsh', name: 'Zsh', category: 'shell', patterns: [basename('.zshrc'), basename('.zshenv'), basename('.zprofile'), basename('zshrc'), configDir('zsh'), suffix('.zsh')] },
  { slug: 'bash', name: 'Bash', category: 'shell', patterns: [basename('.bashrc'), basename('.bash_profile'), basename('.bash_aliases'), basename('bashrc')] },
  { slug: 'fish', name: 'Fish', category: 'shell', patterns: [configDir('fish'), suffix('.fish')] },
  { slug: 'nushell', name: 'Nushell', category: 'shell', patterns: [configDir('nushell'), suffix('.nu')] },
  { slug: 'tmux', name: 'tmux', category: 'multiplexer', patterns: [basename('.tmux.conf'), basename('tmux.conf'), configDir('tmux')] },
  { slug: 'zellij', name: 'Zellij', category: 'multiplexer', patterns: [configDir('zellij')] },
  { slug: 'starship', name: 'Starship', category: 'prompt', patterns: [basename('starship.toml')] },
  { slug: 'powerlevel10k', name: 'Powerlevel10k', category: 'prompt', patterns: [basename('.p10k.zsh'), basename('p10k.zsh')] },
  { slug: 'alacritty', name: 'Alacritty', category: 'terminal', patterns: [configDir('alacritty'), basename('alacritty.yml'), basename('alacritty.toml')] },
  { slug: 'kitty', name: 'kitty', category: 'terminal', patterns: [configDir('kitty'), basename('kitty.conf')] },
  { slug: 'wezterm', name: 'WezTerm', category: 'terminal', patterns: [configDir('wezterm'), basename('.wezterm.lua'), basename('wezterm.lua')] },
  { slug: 'ghostty', name: 'Ghostty', category: 'terminal', patterns: [configDir('ghostty')] },
  { slug: 'iterm2', name: 'iTerm2', category: 'terminal', patterns: [basename('com.googlecode.iterm2.plist')] },
  { slug: 'git', name: 'Git', category: 'vcs', patterns: [basename('.gitconfig'), basename('gitconfig'), configDir('git')] },
  { slug: 'gh', name: 'GitHub CLI', category: 'vcs', patterns: [configDir('gh')] },
  { slug: 'lazygit', name: 'lazygit', category: 'vcs', patterns: [configDir('lazygit')] },
  { slug: 'homebrew', name: 'Homebrew', category: 'package', patterns: [basename('brewfile'), suffix('.brewfile')] },
  { slug: 'nix', name: 'Nix', category: 'package', patterns: [basename('flake.nix'), basename('configuration.nix'), suffix('.nix')] },
  { slug: 'home-manager', name: 'Home Manager', category: 'package', patterns: [basename('home.nix'), configDir('home-manager')] },
  { slug: 'mise', name: 'mise', category: 'runtime', patterns: [basename('.mise.toml'), basename('mise.toml'), configDir('mise')] },
  { slug: 'asdf', name: 'asdf', category: 'runtime', patterns: [basename('.tool-versions'), basename('.asdfrc')] },
  { slug: 'direnv', name: 'direnv', category: 'runtime', patterns: [basename('.envrc'), basename('.direnvrc'), configDir('direnv')] },
  { slug: 'atuin', name: 'Atuin', category: 'cli', patterns: [configDir('atuin')] },
  { slug: 'fzf', name: 'fzf', category: 'cli', patterns: [basename('.fzf.zsh'), basename('.fzf.bash'), configDir('fzf')] },
  { slug: 'ripgrep', name: 'ripgrep', category: 'cli', patterns: [basename('.rgignore'), basename('.ripgreprc'), basename('ripgreprc')] },
  { slug: 'bat', name: 'bat', category: 'cli', patterns: [configDir('bat')] },
  { slug: 'eza', name: 'eza', category: 'cli', patterns: [configDir('eza')] },
  { slug: 'curl', name: 'curl', category: 'cli', patterns: [basename('.curlrc')] },
  { slug: 'ssh', name: 'OpenSSH', category: 'other', patterns: [dir('.ssh'), basename('ssh_config')] },
  { slug: 'karabiner', name: 'Karabiner-Elements', category: 'other', patterns: [configDir('karabiner'), basename('karabiner.json')] },
  { slug: 'hammerspoon', name: 'Hammerspoon', category: 'launcher', patterns: [dir('.hammerspoon'), configDir('hammerspoon')] },
  { slug: 'skhd', name: 'skhd', category: 'launcher', patterns: [basename('.skhdrc'), basename('skhdrc'), configDir('skhd')] },
  { slug: 'yabai', name: 'yabai', category: 'wm', patterns: [basename('.yabairc'), basename('yabairc'), configDir('yabai')] },
  { slug: 'aerospace', name: 'AeroSpace', category: 'wm', patterns: [basename('.aerospace.toml'), basename('aerospace.toml'), configDir('aerospace')] },
  { slug: 'sketchybar', name: 'SketchyBar', category: 'wm', patterns: [configDir('sketchybar')] },
  { slug: 'i3', name: 'i3', category: 'wm', patterns: [configDir('i3')] },
  { slug: 'sway', name: 'Sway', category: 'wm', patterns: [configDir('sway')] },
  { slug: 'hyprland', name: 'Hyprland', category: 'wm', patterns: [configDir('hypr'), basename('hyprland.conf')] },
  { slug: 'waybar', name: 'Waybar', category: 'wm', patterns: [configDir('waybar')] },
];

export const TOOL_REGISTRY: ToolDef[] = SPECS.map((spec) => ({
  slug: spec.slug,
  name: spec.name,
  category: spec.category,
  match: compile(spec.patterns),
}));

export const TOOL_BY_SLUG: ReadonlyMap<string, ToolDef> = new Map(TOOL_REGISTRY.map((tool) => [tool.slug, tool]));

// .config/<name> dirs the registry already accounts for; used to gate fallback detection.
export const CLAIMED_CONFIG_DIRS: ReadonlySet<string> = new Set([
  ...SPECS.map((spec) => spec.slug),
  ...SPECS.flatMap((spec) =>
    spec.patterns.filter((pattern) => pattern.kind === 'configDir').map((pattern) => pattern.value),
  ),
]);

export function slugsMatchingQuery(query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];
  return TOOL_REGISTRY.filter(
    (tool) => tool.slug.includes(needle) || tool.name.toLowerCase().includes(needle),
  ).map((tool) => tool.slug);
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'editor',
  'shell',
  'terminal',
  'multiplexer',
  'prompt',
  'package',
  'runtime',
  'cli',
  'vcs',
  'wm',
  'launcher',
  'other',
];

export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  editor: 'Editors',
  shell: 'Shells',
  terminal: 'Terminals',
  multiplexer: 'Multiplexers',
  vcs: 'VCS',
  wm: 'Window managers',
  launcher: 'Launchers',
  prompt: 'Prompts',
  package: 'Packages',
  runtime: 'Runtimes',
  cli: 'CLI tools',
  other: 'Other',
};

const CATEGORY_SET = new Set<string>(CATEGORY_ORDER);

export function parseCategory(raw: string | undefined): ToolCategory | '' {
  const value = raw?.trim() ?? '';
  return CATEGORY_SET.has(value) ? (value as ToolCategory) : '';
}

export function slugsInCategory(category: ToolCategory): string[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category).map((tool) => tool.slug);
}
