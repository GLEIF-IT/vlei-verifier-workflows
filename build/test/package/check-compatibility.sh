function runNodeTest() {
    echo "\n[node.js]:\n"
    cd "build/test/package/node" || { echo "Directory not found"; exit 1; }
    rm -rf node_modules
    npm run node-test || { echo "Node test failed"; exit 1; }
}

# echo "...working dir: $(pwd)"
runNodeTest
# echo "...working dir: $(pwd)"