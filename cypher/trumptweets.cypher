CREATE INDEX ON :User(name);
CREATE INDEX ON :Tweet(text);
CREATE INDEX ON :Hashtag()

UNWIND [
  'http://www.trumptwitterarchive.com/data/realdonaldtrump/2017.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2016.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2015.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2014.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2013.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2012.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2011.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2010.json',
  'http://trumptwitterarchivedata.s3-website-us-east-1.amazonaws.com/data/realdonaldtrump/2009.json'
] AS url
CALL apoc.load.json(url) YIELD value as t
MERGE (s:Source { name: t.source })
CREATE (tweet:Tweet {
    id_str: t.id_str,
    text: t.text,
    created_at: t.created_at,
    retweets: t.retweet_count,
    favorites: t.favorite_count,
    retweet: t.is_retweet,
    in_reply: coalesce(t.in_reply_to_user_id_str, '')
})
CREATE (tweet)-[:from]->(s)
RETURN count(t);

/* Hashtag Analysis */
MATCH (t:Tweet) 
WHERE t.text =~ ".*#.*" 
WITH 
  t, 
  apoc.text.regexGroups(t.text, "(#\\w+)")[0] as hashtags 
UNWIND hashtags as hashtag
MERGE (h:Hashtag { name: toUpper(hashtag) })
MERGE (h)<-[:hashtag { used: hashtag }]-(t)
RETURN count(h);

/* User Mention Analysis */
MATCH (t:Tweet) 
WHERE t.text =~ ".*@.*" 
WITH 
  t, 
  apoc.text.regexGroups(t.text, "(@\\w+)")[0] as mentions
UNWIND mentions as mention
MERGE (u:User { name: mention })
MERGE (u)<-[:mention]-(t)
RETURN count(u);

/* Which hashtags get retweeted the most? */
MATCH (h:Hashtag)-[]-(t:Tweet)
RETURN distinct(h.name), sum(t.retweets) as totRetweets, sum(t.favorites) as totFavorites
ORDER BY totFavorites DESC;

/* Which accounts get mentioned the most? */
MATCH (t:Tweet)-[:mention]->(u:User)
RETURN u.name, count(t) as mentions
ORDER BY mentions DESC;

/* What do the different sources tweet about? */
MATCH (s:Source)-[]-(t:Tweet)-[]-(h:Hashtag)
RETURN distinct s.name, count(t) as totalTweets, collect(distinct h.name) as hashtags
ORDER BY totalTweets DESC;

/* Who does Trump talk about the most? */
MATCH (u:User)
WITH collect(u) AS users
// compute over relationships of all types
CALL apoc.algo.pageRank(users) YIELD node, score
RETURN node.name, score
ORDER BY score DESC
LIMIT 50;


/* NLP */

/* Annotate with language */
MATCH (t:Tweet)
CALL ga.nlp.detectLanguage(t.text)
YIELD result
SET t.language = result
RETURN count(t);

/* Only supports english */

/* Enrich */
MATCH (n:Tag)
CALL ga.nlp.enrich.concept({tag: n, depth:2, admittedRelationships:["IsA","PartOf"]})
YIELD result
RETURN count(result);

/* Show related relationships */
MATCH (t:Tag { value: 'election' })-[r]-(ot:Tag) 
return t.value, type(r), ot.value;

MATCH (t:Tweet)-[]-(a:AnnotatedText) 
CALL ga.nlp.sentiment(a) YIELD result 
RETURN count(result);

/* Talking about the clintons */
MATCH (:NER_Person {value: 'clintons'})-[]-(s:Sentence)-[]-(:AnnotatedText)-[]-(tweet:Tweet) 
RETURN distinct tweet.text;


/* Which people does he talk about the most? *
MATCH (t:NER_Person)--(:TagOccurrence)--(:Sentence)--(:AnnotatedText)--(tw:Tweet) 
WHERE not t:NER_O return distinct t.value, labels(t), count(tw) as x order by x desc limit 10;


MATCH (t:NER_Organization)--(:TagOccurrence)--(:Sentence)--(:AnnotatedText)--(tw:Tweet) 
WHERE not t:NER_O return distinct t.value, labels(t), count(tw) as x order by x desc limit 10;