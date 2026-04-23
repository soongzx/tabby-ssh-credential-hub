#!/bin/bash

# Build plugin for production
set -e

echo "Building tabby-ssh-credential-hub..."

npm run build

echo ""
echo "Build complete! Output in dist/"
echo ""
echo "To install:"
echo "  - Linux: ~/.config/tabby/plugins/"
echo "  - macOS: ~/Library/Application Support/tabby/plugins/"
echo "  - Windows: %APPDATA%\\tabby\\plugins\\"