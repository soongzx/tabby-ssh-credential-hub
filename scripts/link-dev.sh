#!/bin/bash

# Link plugin for development
# Usage: ./scripts/link-dev.sh [/path/to/tabby]

set -e

TABBY_PATH="${1:-$HOME/tabby}"
PLUGIN_PATH="$(cd "$(dirname "$0")/.." && pwd)"
LINK_PATH="$TABBY_PATH/plugins/tabby-ssh-credential-hub"

echo "Linking tabby-ssh-credential-hub to $TABBY_PATH..."

# Create plugins directory if it doesn't exist
mkdir -p "$TABBY_PATH/plugins"

# Remove existing link if present
if [ -L "$LINK_PATH" ]; then
    rm "$LINK_PATH"
    echo "Removed existing link"
fi

# Create symlink
ln -s "$PLUGIN_PATH" "$LINK_PATH"
echo "Created symlink: $LINK_PATH -> $PLUGIN_PATH"

echo "Done!"
echo ""
echo "To run Tabby with the plugin:"
echo "  cd $TABBY_PATH && npm run start"
echo ""
echo "Or with TABBY_PLUGINS environment variable:"
echo "  TABBY_PLUGINS=$PLUGIN_PATH $TABBY_PATH/tabby --debug"