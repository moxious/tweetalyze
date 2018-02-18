USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///trollhits.csv' as line
WITH line
MATCH (tr:Troll { screen_name: line.screen_name })
MATCH (tw:Tweet { id_str: toString(line.id) })
CREATE (tw)-[:trollhit]->(tr);

MATCH (troll:Troll)
WITH troll
MATCH (t:Tweet)
WHERE t.text CONTAINS troll.screen_name
CREATE (t)-[:trollhit]->(troll);

MATCH (tr:Troll) 
WITH tr, "https://twitter.com/" + tr.screen_name AS trollpage
MATCH (u:URL)
WHERE u.url STARTS WITH trollpage
CREATE (tr)<-[:trollhit]-(u);

MATCH (tr:Troll) 
WITH tr, "https://twitter.com/" + tr.screen_name AS trollpage
MATCH (med:Media)
WHERE med.url STARTS WITH trollpage
CREATE (tr)<-[:trollhit]-(med);


MATCH (:Troll)-[:trollhit]-(u:URL)-[]-(tw:Tweet)-[:trollhit]->(tr:Troll), (tw)-[:status]-(poster:User) RETURN u.url as TrollURL, tw.text as InfluencedTweet, poster.screen_name as Poster, tr.screen_name as TrollName;