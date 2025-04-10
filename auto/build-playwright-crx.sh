#!/bin/bash -e

cd "$(dirname "${BASH_SOURCE[0]}")/../"

git_clone_playwright_crx() {
  echo "🗄️ Git clone tearline-xyz/playwright-crx"

  # Test which domain is accessible via SSH
  if ssh -T git@github.tearline -o BatchMode=yes -o ConnectTimeout=5 2>&1 | grep -q "successfully authenticated"; then
    DOMAIN="github.tearline"
  elif ssh -T git@github.com -o BatchMode=yes -o ConnectTimeout=5 2>&1 | grep -q "successfully authenticated"; then
    DOMAIN="github.com"
  else
    echo "🚨 Error: Unable to connect to either github.tearline or github.com via SSH"
    exit 1
  fi

  echo "🔗 Using domain: $DOMAIN"

  git clone git@${DOMAIN}:tearline-xyz/playwright-crx.git

  cd playwright-crx
  # Rename the default remote to "tearline"
  git remote rename origin tearline

  # Since the remote repo only has one branch named 'tearline', we don't need to create a new branch, just ensure we're on it
  git checkout tearline
  cd -
}

echo '📍 Git clone playwright-crx if it does not exist'
if [ -d "playwright-crx" ]; then
  echo "⚡ playwright-crx directory already exists, skipping git clone"
else
  git_clone_playwright_crx
fi

cd playwright-crx
echo '🔨 Load nvm and use specified node.js version'
\. $HOME/.nvm/nvm.sh
nvm use

echo '📍 Install playwright-crx dependencies'
CORE_SOURCE_FILE="src/index.ts"
npm install

echo "📍 Running linter on ${CORE_SOURCE_FILE} to fix any issues"
npx eslint --fix ${CORE_SOURCE_FILE}

echo '📍 Build playwright-crx'
npm run build:crx

echo '👌 Done'
