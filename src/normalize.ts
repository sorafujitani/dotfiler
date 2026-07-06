// chezmoi source-state attribute prefixes; stripped repeatedly because they stack (e.g. private_readonly_).
const ATTRIBUTE_PREFIXES = [
  'private_',
  'readonly_',
  'executable_',
  'exact_',
  'empty_',
  'once_',
  'onchange_',
  'create_',
  'modify_',
  'remove_',
  'symlink_',
  'encrypted_',
  'external_',
  'literal_',
  'run_',
  'before_',
  'after_',
];

function normalizeSegment(segment: string): string {
  let rest = segment;
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const prefix of ATTRIBUTE_PREFIXES) {
      if (rest.startsWith(prefix)) {
        rest = rest.slice(prefix.length);
        stripped = true;
      }
    }
  }
  // holman-style repos mark linked files with a .symlink suffix (git/gitconfig.symlink).
  if (rest.endsWith('.symlink')) rest = rest.slice(0, -'.symlink'.length);
  // yadm alternates append ##<condition> (dot_zshrc##os.Darwin).
  const alternate = rest.indexOf('##');
  if (alternate > 0) rest = rest.slice(0, alternate);
  if (rest.startsWith('dot_')) return `.${rest.slice('dot_'.length)}`;
  return rest;
}

export function normalizePath(path: string): string {
  return path.split('/').map(normalizeSegment).join('/');
}
