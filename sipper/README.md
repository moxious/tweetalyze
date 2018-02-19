# Sipper

Provide some twitter API credentials and a capture expression, this uses the streaming API and puts all of the results into a local MongoDB database.

# How to set up a sipper

Create a partition file (what to search for) in `sipper.sip.part`.  Example file:

```
#music,#art,#tentacles
```

Create a shell script called "sipper01.sip"

```
#!/bin/bash

export TWITTER_CONSUMER_KEY=(your value here)
export TWITTER_CONSUMER_SECRET=(your value here)
export TWITTER_ACCESS_TOKEN=(your value here)
export TWITTER_ACCESS_TOKEN_SECRET=(your value here)
export MONGO_USERNAME=admin
export MONGO_PASSWORD=whatever
export SIPPER_CHECKPOINT_FREQUENCY=1000

node index.js --label "$0" --partition "$0.part" >>"$0.log" 2>&1
```

This shell script will start your sipper, with log messages going to `sipper.sip.log`.  As you change the partition file, the sipper will keep pace.