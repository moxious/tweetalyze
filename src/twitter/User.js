const twitter = require('./index');
const Neo4jMap = require('./Neo4jMap');
const _ = require('lodash');
const moment = require('moment');

class User extends Neo4jMap {
    constructor(json) {
        super();

        this.props = _.pick(json, [
            'name', 'screen_name', 'location',
            'followers_count', 'friends_count',
            'description', 'statuses_count',
            'verified', 'url', 'utc_offset', 'timezone',
        ]);

        this.props.created_at = twitter.date(json.created_at);
    }

    mergeStatement() {
        return `
            MERGE (u:User { screen_name: "${this.props.screen_name}" })
        `;
    }
}

module.exports = User;

/* 
    Sample Twitter API data for a user.
    contributors_enabled: false,
    created_at: 'Sun Feb 07 22:39:41 +0000 2016',
    default_profile: true,
    default_profile_image: false,
    description: 'All American, born and raised in WI. #TrumpPence #MAGA',
    entities: [Object],
    favourites_count: 56933,
    follow_request_sent: false,
    followers_count: 2002,
    following: false,
    friends_count: 1952,
    geo_enabled: true,
    has_extended_profile: false,
    id: 4885982967,
    id_str: '4885982967',
    is_translation_enabled: false,
    is_translator: false,
    lang: 'en',
    listed_count: 72,
    location: 'Wisconsin, USA',
    name: 'Amy 🇺🇸',
    notifications: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: null,
    profile_background_image_url_https: null,
    profile_background_tile: false,
    profile_image_url: 'http://pbs.twimg.com/profile_images/755752282474545153/lsPU6BgF_normal.jpg',
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/755752282474545153/lsPU6BgF_normal.jpg',
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    protected: false,
    screen_name: 'ContingencyGirl',
    statuses_count: 73140,
    time_zone: null,
    translator_type: 'none',
    url: null,
    utc_offset: null,
    verified: false
*/
