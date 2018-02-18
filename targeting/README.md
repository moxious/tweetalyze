# Targeting

Create a sources.json file that looks like this:

```
[
    {
        "url": "https://docs.google.com/spreadsheets/d/whatever/export?exportFormat=csv&gid=0",
        "name": "accounts",
        "partitionKey": "account",
        "partitionSize": 50,
        "caseInsensitive": true
    }
]
```

Then run:

```
node index.js --sources sources.json
```

This will output a set of partition files and hash files, such as `account-1-part.txt` and `account-1-part.txt.sha`.
