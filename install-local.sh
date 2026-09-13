#!/bin/bash
set -euo pipefail

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SELF_DIR"

for cmd in node pnpm paperclipai; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' was not found in PATH." >&2
    exit 1
  fi
done

echo "==> Board Cockpit local installer"

VERSION=""
MANAGED_PKG="$HOME/.paperclip/cli/installs/npm/package.json"
if [ -f "$MANAGED_PKG" ]; then
  VERSION="$(node -e 'try { const p=require(process.argv[1]); process.stdout.write(String(p.version||"")); } catch(e) {}' "$MANAGED_PKG")"
fi
if [ -z "$VERSION" ]; then
  VERSION="$(paperclipai --version 2>/dev/null | grep -oE '[0-9]{4}\.[0-9]+\.[0-9]+([-.][A-Za-z0-9.]+)?' | head -n1 || true)"
fi
if [ -z "$VERSION" ]; then
  echo "ERROR: could not determine Paperclip version. Run: paperclipai --version" >&2
  exit 1
fi

echo "==> Paperclip version: $VERSION"

# Match the plugin SDK to the locally installed Paperclip release.
node - "$VERSION" <<'NODE'
const fs = require('fs');
const version = process.argv[2];
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.devDependencies['@paperclipai/plugin-sdk'] = version;
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
NODE

echo "==> Installing dependencies"
pnpm install --registry=https://registry.npmjs.org

echo "==> Typecheck"
pnpm typecheck

echo "==> Tests"
pnpm test

echo "==> Build"
pnpm build

PLUGIN_ID="rolid.board-cockpit"
PLUGIN_INFO="$(paperclipai plugin inspect "$PLUGIN_ID" 2>/dev/null || true)"

if [ -z "$PLUGIN_INFO" ]; then
  echo "==> Installing local plugin into Paperclip"
  paperclipai plugin install "$SELF_DIR"
elif echo "$PLUGIN_INFO" | grep -q 'status=uninstalled'; then
  echo "==> Reinstalling previously uninstalled local plugin"
  paperclipai plugin install "$SELF_DIR"
else
  echo "==> Upgrading existing local plugin in Paperclip"
  paperclipai plugin upgrade "$PLUGIN_ID"
fi

echo
echo "==> Verify"
echo "paperclipai plugin inspect rolid.board-cockpit"
echo "paperclipai plugin health rolid.board-cockpit"
echo
echo "Reload the Paperclip UI after a successful install/upgrade."
