# Sipper

Provide some twitter API credentials and a capture expression, this uses the streaming API
and puts all of the results into a local MongoDB database.

# Credentials

Place a `creds.json` file looking like this:

```
{
    "consumer_key": "A",
    "consumer_secret": "B",
    "access_token": "C",
    "access_token_secret": "D"
}
```