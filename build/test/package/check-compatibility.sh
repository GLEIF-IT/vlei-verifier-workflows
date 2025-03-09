#!/bin/bash

runNodeTest() {
    printf "\n\e[34m***********\n"
    printf "* Node.js *\n"
    printf "***********\e[0m\n\n"
    
    cd "build/test/package/node" || { echo "Directory not found"; exit 1; }
    rm -rf node_modules
    npm run node-test || { echo "Node test failed"; exit 1; }
}

echo "Checking compatibility..."
runNodeTest
echo ""