/**
 * Prefix resolver — composable template variables for announcement prefixes.
 *
 * Template syntax:
 *   ${dirname}          — basename of cwd
 *   ${project}          — project name from manifest files (package.json, pyproject.toml, etc.)
 *   ${project|dirname}  — pipe means "try left, fall back to right"
 *
 * Literal text is preserved as-is: "Project ${project|dirname}" → "Project my-app"
 * Unknown variables and all-null chains resolve to empty string.
 */

import { basename, join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";

/** Default prefix template — project name with dirname fallback. */
export const DEFAULT_PREFIX = "${project|dirname}";

// ---------------------------------------------------------------------------
// Resolvers — each is (cwd: string) => string | null
// ---------------------------------------------------------------------------

const RESOLVERS = {
  dirname: (cwd) => (cwd ? basename(cwd) : null),
  project: readProjectName,
};

// ---------------------------------------------------------------------------
// Project manifest readers, tried in priority order.
// Each entry: [filename, extractorFn(contents) => string|null]
// ---------------------------------------------------------------------------

/** @type {Array<[string, (content: string) => string|null]>} */
const MANIFEST_READERS = [
  ["package.json", extractPackageName],
  ["pyproject.toml", extractPyprojectName],
  ["Cargo.toml", extractTomlSectionField("package", "name")],
  ["setup.cfg", extractIniSectionField("metadata", "name")],
  ["go.mod", extractGoModule],
  ["composer.json", extractComposerName],
  ["pubspec.yaml", extractYamlScalar("name")],
  // gemspec handled separately — requires glob
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a prefix template string against the given working directory.
 *
 * @param {string} template - e.g. "${project|dirname}" or "my-app"
 * @param {string} cwd - Absolute path to the project directory
 * @returns {string} Resolved prefix (may be empty)
 */
export function resolvePrefix(template, cwd) {
  if (!template) return "";
  return template.replace(/\$\{([^}]+)\}/g, (_match, expr) => {
    const candidates = expr.split("|");
    for (const name of candidates) {
      const resolver = RESOLVERS[name.trim()];
      if (!resolver) continue;
      const value = resolver(cwd);
      if (value) return value;
    }
    return "";
  });
}

// ---------------------------------------------------------------------------
// readProjectName — walks manifests in priority order
// ---------------------------------------------------------------------------

/**
 * Read the project name from the first recognized manifest file in cwd.
 * Returns null if no manifest is found or none yields a name.
 *
 * @param {string} cwd
 * @returns {string|null}
 */
function readProjectName(cwd) {
  if (!cwd) return null;

  // Fixed-name manifests
  for (const [filename, extractor] of MANIFEST_READERS) {
    const filepath = join(cwd, filename);
    const content = readFileSafe(filepath);
    if (content === null) continue;
    const name = extractor(content);
    if (name) return name;
  }

  // *.gemspec — need a directory listing
  try {
    const entries = readdirSync(cwd);
    const gemspec = entries.find((e) => e.endsWith(".gemspec"));
    if (gemspec) {
      const content = readFileSafe(join(cwd, gemspec));
      if (content) {
        const name = extractGemspecName(content);
        if (name) return name;
      }
    }
  } catch {
    // directory unreadable — skip
  }

  return null;
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

/** JSON field extractor factory. */
function extractJsonField(field) {
  return (content) => {
    try {
      const obj = JSON.parse(content);
      const val = obj?.[field];
      return typeof val === "string" && val.trim() ? val.trim() : null;
    } catch {
      return null;
    }
  };
}

/** package.json: strip npm scope (@scope/name → name). */
function extractPackageName(content) {
  const name = extractJsonField("name")(content);
  if (!name) return null;
  // Strip @scope/ prefix for TTS-friendly output
  const slashIdx = name.indexOf("/");
  return slashIdx >= 0 && name.startsWith("@") ? name.slice(slashIdx + 1) : name;
}

/** composer.json: name is "vendor/package" — return the package segment. */
function extractComposerName(content) {
  try {
    const obj = JSON.parse(content);
    const val = obj?.name;
    if (typeof val !== "string" || !val.trim()) return null;
    const parts = val.split("/");
    return parts[parts.length - 1].trim() || null;
  } catch {
    return null;
  }
}

/**
 * pyproject.toml: check [project].name then [tool.poetry].name.
 * Lightweight line-based extraction — no full TOML parser.
 */
function extractPyprojectName(content) {
  return (
    extractTomlSectionField("project", "name")(content) ||
    extractTomlNestedField("tool.poetry", "name")(content)
  );
}

/**
 * Factory: extract `key = "value"` under a [section] header in TOML.
 * Handles both `key = "value"` and `key = 'value'`.
 */
function extractTomlSectionField(section, key) {
  // Match [section] exactly (no dots, no sub-tables)
  const headerRe = new RegExp(`^\\[${escapeRegex(section)}\\]\\s*$`);
  const fieldRe = new RegExp(`^${escapeRegex(key)}\\s*=\\s*["'](.+?)["']`);
  return (content) => extractFromSections(content, headerRe, fieldRe);
}

/**
 * Factory: extract `key = "value"` under a [dotted.section] header in TOML.
 * e.g. [tool.poetry] → key = "value"
 */
function extractTomlNestedField(dottedSection, key) {
  const headerRe = new RegExp(`^\\[${escapeRegex(dottedSection)}\\]\\s*$`);
  const fieldRe = new RegExp(`^${escapeRegex(key)}\\s*=\\s*["'](.+?)["']`);
  return (content) => extractFromSections(content, headerRe, fieldRe);
}

/** Shared: scan lines for a section header, then find a field before the next header. */
function extractFromSections(content, headerRe, fieldRe) {
  const lines = content.split("\n");
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inSection = headerRe.test(trimmed);
      continue;
    }
    if (inSection) {
      const m = fieldRe.exec(trimmed);
      if (m) return m[1].trim() || null;
    }
  }
  return null;
}

/** setup.cfg: INI-style [metadata] section, name = value (no quotes). */
function extractIniSectionField(section, key) {
  const headerRe = new RegExp(`^\\[${escapeRegex(section)}\\]\\s*$`, "i");
  const fieldRe = new RegExp(`^${escapeRegex(key)}\\s*=\\s*(.+)`, "i");
  return (content) => {
    const lines = content.split("\n");
    let inSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[")) {
        inSection = headerRe.test(trimmed);
        continue;
      }
      if (inSection) {
        const m = fieldRe.exec(trimmed);
        if (m) return m[1].trim() || null;
      }
    }
    return null;
  };
}

/** go.mod: `module github.com/user/repo` → "repo" */
function extractGoModule(content) {
  const m = /^module\s+(\S+)/m.exec(content);
  if (!m) return null;
  const parts = m[1].split("/");
  return parts[parts.length - 1].trim() || null;
}

/** *.gemspec: first `spec.name = "value"` or `.name = "value"` */
function extractGemspecName(content) {
  const m = /\.name\s*=\s*["'](.+?)["']/.exec(content);
  return m ? m[1].trim() || null : null;
}

/** YAML top-level scalar: `name: value` */
function extractYamlScalar(key) {
  const re = new RegExp(`^${escapeRegex(key)}:\\s*(.+)`, "m");
  return (content) => {
    const m = re.exec(content);
    if (!m) return null;
    // Strip surrounding quotes if present
    let val = m[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val || null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileSafe(filepath) {
  try {
    if (!existsSync(filepath)) return null;
    return readFileSync(filepath, "utf-8");
  } catch {
    return null;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
