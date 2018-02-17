
/* 
First the Ninth Circuit rules against the ban &amp; now it hits again on sanctuary cities-both ridiculous rulings.
See you in the Supreme Court!
*/
MATCH (tw:Tweet) where id(tw) = 1626
RETURN tw;

/* Hashtags, mentions, and NLP */
MATCH (tw:Tweet) where id(tw) = 20
return tw;

/* Which hashtags get retweeted the most? */
MATCH (h:Hashtag)-[]-(t:Tweet)
RETURN distinct(h.name), 
       sum(t.retweets) as totRetweets, 
       sum(t.favorites) as totFavorites
ORDER BY totFavorites DESC;

/* Sample hashtag to explore */
MATCH (h:Hashtag { name: '#JFKFILES' })-[r]-(t:Tweet)
RETURN h, r, t;

/* Looking things up by person / organization */
/* Talking about the clintons */
MATCH (:NER_Person {value: 'clintons'})-[]-(s:Sentence)-[]-(:AnnotatedText)-[]-(tweet:Tweet) 
RETURN distinct tweet.text;

/* Which people does he talk about the most? *
MATCH (t:NER_Person)--(:TagOccurrence)--(:Sentence)--(:AnnotatedText)--(tw:Tweet) 
WHERE not t:NER_O return distinct t.value, labels(t), count(tw) as x order by x desc limit 10;

/* Organizations */
MATCH (t:NER_Organization)--(:TagOccurrence)--(:Sentence)--(:AnnotatedText)--(tw:Tweet) 
WHERE not t:NER_O return distinct t.value, labels(t), count(tw) as x order by x desc limit 10;

/* Concept enrichment */

/* Show related relationships */
MATCH (t:Tag { value: 'election' })-[r]-(ot:Tag) 
return t.value, type(r), ot.value;

/* Show tweets about topics related to elections */
MATCH (t:Tag { value: 'election' })-[r:IS_RELATED_TO]-(ot:Tag)-[:HAS_TAG]-(s:Sentence)-[]-(:AnnotatedText)-[]-(tw:Tweet)
where ot.value <> 'status'
return distinct(tw.text), tw.created_at 
ORDER BY tw.created_at DESC;


/* Sentiment analysis -- negative person mentions */
MATCH (t:NER_Person)--(:TagOccurrence)--(s:Negative)--(:AnnotatedText)--(tw:Tweet) 
WHERE not t:NER_O return distinct t.value, labels(t), count(tw) as x order by x desc limit 10;


