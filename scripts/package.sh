#!/bin/sh
# Bouwt de zip voor de Chrome Web Store / Edge Add-ons: dist/floating-board-for-lichess-<versie>.zip
set -e
cd "$(dirname "$0")/.."

version=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
if grep -q 'const DEBUG = true' content.js; then
  echo "DEBUG staat aan in content.js; eerst uitzetten." >&2
  exit 1
fi

mkdir -p dist
out="dist/floating-board-for-lichess-$version.zip"
rm -f "$out"
zip -r -X "$out" manifest.json content.js icons _locales -x '.*' >/dev/null
echo "$out"
unzip -l "$out"
