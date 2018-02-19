const uuid = require('uuid');
const _ = require('lodash');
const Twit = require('twit');
const MongoClient = require('mongodb').MongoClient;
const moment = require('moment');
const yargs = require('yargs');
const Promise = require('bluebird');

const SIPPER_VERSION = '0.05';

let creds;
try {
  creds = require('./creds.json');
} catch (err) {
  creds = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };
}

T = new Twit(_.merge(creds, {
  timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
}));

const genericHandler = (err, data) => {
  if (err) { console.error('ERROR FETCHING', err); }
  else {
    console.log(JSON.stringify(data, null, 2));
  }
}

const goodLists = [
  // Examples.
  { slug: 'world-leaders', owner_screen_name: 'verified' },
  { slug: 'us-congress', owner_screen_name: 'verified' },
  { slug: 'white-house-staff', owner_screen_name: 'digiphile' },
  { slug: 'political-journalists', owner_screen_name: 'mattklewis' },
];

const slug = 'white-house-staff';
const owner_screen_name = 'digiphile';

T.get('lists/members', {
  slug,
  owner_screen_name,
  count: 1000,
}, (err, data, response) => {
  if (err) {
    console.error('ERROR FETCHING', err);
  } else {
    const res = data.users.map(user => {
      return ['@' + user.screen_name, `member of list ${slug} by ${owner_screen_name}`].join(',');
    });
    console.log(res.join('\n'));
  }
});

/*T.get('trends/place', {
  id: 1,
}, genericHandler);*/
