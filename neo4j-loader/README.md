# Neo4j Tweet Loader

This script expects only files in "one tweet per line" format.  The format of the JSON tweets must be what comes from the twitter streaming API.

# Configure and Run

```
export NEO4J_URI=bolt://localhost
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=neo4j

yarn install

node loader.js --file dump.json
```