#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build
cd dist
zip -r "$ROOT/ctrl-web-extension.zip" .
echo "Created $ROOT/ctrl-web-extension.zip"
echo "Load the dist/ folder or unzip and load unpacked in chrome://extensions"
