#!/bin/bash

# Store the base directory of the script dynamically, so we can navigate to the root of the project whenever needed
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

runNodeTest() {
    printf "\n\e[34m***********\n"
    printf "* Node.js *\n"
    printf "***********\e[0m\n\n"
    
    cd "$BASE_DIR/node" || { echo "Directory not found"; exit 1; }
    rm -rf node_modules
    npm run node-test || { echo "Node test failed"; exit 1; }
}

# Ensure we always start from the base directory
cd "$BASE_DIR" || { echo "Failed to navigate to base directory"; exit 1; }

echo "Checking compatibility..."
runNodeTest
echo ""