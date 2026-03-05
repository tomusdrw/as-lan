#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new JAM service project using the as-lan SDK.
# Uses the fibonacci example as a template, fetching files from GitHub Pages.
# Usage: start.sh <service-name>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <service-name>"
  echo "Example: $0 my-service"
  exit 1
fi

NAME="$1"
AS_LAN_REPO="${AS_LAN_REPO:-https://github.com/fluffylabs/as-lan.git}"
BASE_URL="${BASE_URL:-https://todr.me/as-lan/fibonacci}"

if [ -d "$NAME" ]; then
  echo "Error: directory '$NAME' already exists."
  exit 1
fi

echo "Creating JAM service '$NAME'..."

mkdir -p "$NAME"
cd "$NAME"

git init -q

echo "Adding as-lan SDK as git submodule..."
git submodule add -q "$AS_LAN_REPO" sdk

# --- Download template files from the fibonacci example ---
FILES=(
  asconfig.json
  assembly/index.ts
  assembly/fibonacci.ts
  assembly/index.test.ts
  assembly/test-run.ts
  assembly/tsconfig.json
  ecalli/index.js
  ecalli/package.json
  bin/test.js
  package.json
)

for file in "${FILES[@]}"; do
  mkdir -p "$(dirname "$file")"
  echo "  Downloading $file..."
  curl -sfL "$BASE_URL/$file" -o "$file"
done

# --- Patch package.json: name and SDK path ---
sed -i.bak \
  -e "s|@fluffylabs/as-lan-fibonacci-example|$NAME|" \
  -e 's|file:../../sdk|file:./sdk|' \
  package.json
rm package.json.bak

# --- Patch assembly/tsconfig.json: SDK paths ---
sed -i.bak \
  -e 's|\.\./\.\./\.\./sdk/|../sdk/|g' \
  assembly/tsconfig.json
rm assembly/tsconfig.json.bak

# --- Generate .gitignore (not worth a fetch) ---
cat > .gitignore <<'IGNEOF'
node_modules
build
IGNEOF

echo "Installing dependencies..."
npm install

echo ""
echo "Success! Your JAM service '$NAME' is ready."
echo ""
echo "Next steps:"
echo "  cd $NAME"
echo "  npm run build          # compile WASM (debug + release)"
echo "  npm test               # run tests"
echo "  # edit assembly/fibonacci.ts to implement your service logic"
echo ""
