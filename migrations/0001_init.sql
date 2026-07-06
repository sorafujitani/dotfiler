CREATE TABLE repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  default_branch TEXT NOT NULL,
  html_url TEXT NOT NULL,
  registered_at TEXT NOT NULL,
  scanned_at TEXT NOT NULL,
  UNIQUE (owner, name)
);

CREATE TABLE repo_tools (
  repo_id INTEGER NOT NULL REFERENCES repos (id) ON DELETE CASCADE,
  tool_slug TEXT NOT NULL,
  matched_path TEXT NOT NULL,
  PRIMARY KEY (repo_id, tool_slug)
);

CREATE INDEX idx_repo_tools_tool_slug ON repo_tools (tool_slug);
