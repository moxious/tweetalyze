USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
WITH line
WHERE line.hashtags is not null and line.hashtags <> ''
MATCH (t:Tweet {
    id_str: toString(line.id)
})
WITH t, line, split(line.hashtags, ' ') as hashtags
UNWIND hashtags as hashtag
MERGE (h:Hashtag { name: hashtag })
CREATE (t)-[:hashtag]->(h)
RETURN count(t);

USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
WITH line
WHERE line.urls is not null and line.urls <> ''
MATCH (t:Tweet {
    id_str: toString(line.id)
})
WITH t, line, split(line.urls, ' ') as urls
UNWIND urls as url
MERGE (u:URL { url: url })
CREATE (t)-[:link]->(u)
RETURN count(t);

USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
WITH line
WHERE line.media is not null and line.media <> ''
MATCH (t:Tweet {
    id_str: toString(line.id)
})
WITH t, line, split(line.media, ' ') as mediaURLs
UNWIND mediaURLs as media
MERGE (med:Media {
    url: media
})
CREATE (t)-[:media]->(med)
RETURN count(t);

