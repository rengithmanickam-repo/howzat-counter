#!/bin/bash
set -e

echo ">>> Installing Node.js via Homebrew"
brew install node

echo ">>> Navigating to project root"
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo ">>> Installing npm dependencies"
npm ci

echo ">>> Building Angular app"
npm run build

echo ">>> Syncing Capacitor iOS"
npx cap sync ios

echo ">>> Build preparation complete"
