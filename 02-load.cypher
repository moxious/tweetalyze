USING PERIODIC COMMIT 500
LOAD CSV WITH HEADERS FROM 'file:///loadme.csv' as line
MERGE (u:User {
    screen_name: line.user_screen_name,
    created_at: line.user_created_at,
    description: coalesce(line.user_description, ''),
    location: coalesce(line.user_location, ''),
    timezone: coalesce(line.user_time_zone, ''),
    verified: line.user_verified,
    source: coalesce(line.source, '')
})
CREATE (t:Tweet {
    created_at: line.created_at,
    coordinates: coalesce(line.coordinates, ''),
    favorite_count: line.favorite_count,
    retweet_count: line.retweet_count,
    id_str: toString(line.id),
    lang: line.lang,
    place: coalesce(line.place, ''),
    possibly_sensitive: coalesce(line.possibly_sensitive, ''),
    text: line.text
})

CREATE (t)<-[:status]-(u)

RETURN count(t);

