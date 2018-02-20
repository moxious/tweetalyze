WITH $tweetArr AS tweets
UNWIND tweets AS tweet

MERGE (u:User {id: coalesce(tweet.user.id_str, toString(tweet.user.id)) })
ON CREATE SET u = tweet.user

MERGE (t:Tweet {id: coalesce(tweet.id_str, toString(tweet.id)) })
ON CREATE SET t.text = tweet.text,
              t.lang = tweet.lang,
              t.retweet_count = tweet.retweet_count,
              t.favorite_count = tweet.favorite_count,
              t.possibly_sensitive = tweet.possibly_sensitive,
              t.contributors = coalesce(tweet.contributors, ''),
              t.truncated = tweet.truncated,
              t.created_at = tweet.created_at,
              t.filter_level = tweet.filter_level,
              t.timestamp = toInteger(tweet.timestamp_ms),
              t.created_at = apoc.date.parse(tweet.created_at, 'ms', 'EEE MMM dd HH:mm:ss ZZZZZ yyyy'),
              t.retweeted = tweet.retweeted
              
MERGE (u)-[:POSTED]->(t)

// HANDLE REPLY
// Can be a reply to user, but not a tweet
WITH *, CASE WHEN tweet.in_reply_to_user_id IS NOT NULL AND tweet.in_reply_to_status_id IS NULL THEN [1] ELSE [] END AS user_reply

FOREACH (_ IN user_reply |
  MERGE (ru:User {id: coalesce(tweet.in_reply_to_user_id_str, toString(tweet.in_reply_to_user_id)) })
  ON CREATE SET ru.screen_name = tweet.in_reply_to_screen_name
  MERGE (t)-[:IN_REPLY_TO]->(ru)
)

// Reply to a tweet
WITH *, CASE WHEN tweet.in_reply_to_user_id IS NOT NULL AND tweet.in_reply_to_status_id IS NOT NULL THEN [1] ELSE [] END AS tweet_reply

FOREACH ( _ IN tweet_reply |
  MERGE (rt:Tweet {id: coalesce(tweet.in_reply_to_status_id_str, toString(tweet.in_reply_to_status_id)) })
  MERGE (ru:User {id: coalesce(tweet.in_reply_to_user_id_str, toString(tweet.in_reply_to_user_id)) })
  MERGE (ru)-[:POSTED]->(rt)
  MERGE (t)-[:IN_REPLY_TO]->(rt)
)

MERGE (s:Source {name: tweet.source})
MERGE (t)-[:POSTED_VIA]->(s)

//entities.user_mentions
FOREACH (mention IN tweet.entities.user_mentions |
  MERGE (mu:User {id: coalesce(mention.id_str, toString(mention.id)) })
  ON CREATE SET mu.screen_name = mention.screen_name,
                mu.id_str      = mention.id_str
  MERGE (t)-[:MENTIONS]->(mu)
  
)

// entities.urls
 FOREACH (link IN tweet.entities.urls |
   MERGE (l:URL { url: link.url })
    ON CREATE SET l.expanded_url = coalesce(link.expanded_url, '')
   MERGE (t)-[:HAS_LINK]->(l)
)

// entities.hashtags 
FOREACH (ht IN tweet.entities.hashtags |
  MERGE (hashtag:Hashtag { key: toLower(ht.text) })
    ON CREATE SET hashtag.tag = ht.text
  MERGE (t)-[:HAS_TAG]->(hashtag)
)

// entities.media
FOREACH (m IN tweet.entities.media |
  MERGE (media:Media { id: coalesce(m.id_str, toString(m.id)) })
    ON CREATE SET media.expanded_url = m.expanded_url,
                  media.id_str = m.id_str,
                  media.type = m.type,
                  media.url = m.url
  MERGE (t)-[:HAS_MEDIA]->(media)
)
