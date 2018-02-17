const twitter = require('./index');
const Neo4jMap = require('./Neo4jMap');
const User = require('./User');
const _ = require('lodash');

class Tweet extends Neo4jMap {
    constructor(json) {
        super();
        // this.data = json;
        this.user = new User(json.user);

        this.props = _.pick(json, [
            'id_str',
            'source', 'text',
            'favorite_count', 'retweet_count',
            'coordinates', 'contributors',
            'in_reply_to_screen_name',
            'in_reply_to_status_id_str',
            'in_reply_to_user_id_str',
            'is_quote_status',
            'lang', 'place', 'possibly_sensitive',
            'geo',
        ]);

        this.props.created_at = twitter.date(json.created_at);

        if (json.retweeted_status) {
            this.props.retweeted_status = new Tweet(json.retweeted_status);
        }

        this.props.user_mentions = (json.entities.user_mentions || []).map(mStruct => mStruct.screen_name);
        this.props.hashtags = (json.entities.hashtags || []).map(htStruct => htStruct.text);
        this.props.media = this.extractLinks(json.entities.media || []);
        this.props.urls = this.extractLinks(json.entities.urls || []);
    }

    linkMerge(someArray, nodeLabel, relName, propName) {
        return someArray.map((item, idx) => `
            MERGE (${nodeLabel}${idx}:${nodeLabel} { ${propName}: "${item}" })
            MERGE (${nodeLabel}${idx})<-[:${relName}]-(t)
        `).join('\n');
    }

    hashtagMerge() {
        return this.linkMerge(this.props.hashtags, 'Hashtag', 'hashtag', 'text');
    }

    mentionMerge() {
        return this.linkMerge(this.props.user_mentions, 'User', 'mentions', 'screen_name');
    }

    mergeStatement() {
        return `
            ${this.user.mergeStatement()}
            MERGE (t:Tweet {
                id_str: "${this.props.id_str}",
                text: "${this.props.text}"
            })
            MERGE (u)-[:status]->(t)
            ${this.hashtagMerge()}
            ${this.mentionMerge()}
            ${this.props.retweeted_status ? this.props.retweeted_status.mergeStatement() : ''}
        `;
    }

    extractLinks(list) {
        return list.map(mStruct => _.pick(mStruct, [
            'display_url', 'expanded_url', 'id_str', 'type', 'url',
        ]));
    }
}

module.exports = Tweet;
