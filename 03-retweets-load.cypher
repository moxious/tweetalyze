USING PERIODIC COMMIT 100
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
WITH line
WHERE 
  line.reweet_id is not null and line.reweet_id <> ''
MERGE (original:Tweet { id_str: toString(line.reweet_id) })
  ON CREATE SET original.screen_name = line.retweet_screen_name
RETURN count(original);

USING PERIODIC COMMIT 100
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
WITH line
WHERE 
  line.reweet_id is not null and line.reweet_id <> ''
MATCH (original:Tweet { id_str: toString(line.reweet_id) })
MATCH (rt:Tweet { id_str: toString(line.id) })
SET rt:Retweet
CREATE (rt)-[:retweets]->(original)
RETURN null;
