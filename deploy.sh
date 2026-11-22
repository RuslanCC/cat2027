#!/bin/sh
# Rebuild the offline bundle and publish dist/ to GitHub Pages (gh-pages branch).
# Commit your changes on main first: only committed files are published.
set -e
cd "$(dirname "$0")"
node build-offline.mjs
if ! git diff --quiet -- dist; then
  echo "dist/ has uncommitted changes (the offline bundle was rebuilt). Commit them, then run again." >&2
  exit 1
fi
git push origin main
git subtree push --prefix dist origin gh-pages
echo "Published: https://ruslancc.github.io/cat2027/"
