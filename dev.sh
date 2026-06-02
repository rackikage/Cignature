#!/bin/zsh
# Cigs dev server — always uses Node 18 (react-scripts 5 requirement)
export NVM_DIR="$HOME/.nvm"
source "$(brew --prefix nvm)/nvm.sh" 2>/dev/null
nvm use 18 --silent
cd "$(dirname "$0")/frontend"
npx craco start
