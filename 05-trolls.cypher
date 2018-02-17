USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///trolls.csv' as line
WITH line
MERGE (u:User { screen_name: line.screen_name })
SET u:Troll
RETURN count(u);

