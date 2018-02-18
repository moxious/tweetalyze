MATCH (m)-[r]-(n)
DELETE m, r, n;

CREATE INDEX ON :User(screen_name);
CREATE INDEX ON :Tweet(id_str);
CREATE INDEX ON :Hashtag(name);
CREATE INDEX ON :URL(url);
CREATE INDEX ON :Media(url);
