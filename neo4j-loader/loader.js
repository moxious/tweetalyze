const yargs = require('yargs');
const fs = require('fs');
const LineByLineReader = require('line-by-line');
const Promise = require('bluebird');
const neo4j = require('neo4j-driver').v1;
const _ = require('lodash');

if (!yargs.argv.file) {
    throw new Error('Call me with --file somefile.json');
}

const BUF_SIZE = 1000;
let batch = 0;
let lineBuffer = [];

const importTweets = fs.readFileSync('import-cypher/tweets_import.cypher').toString();
const importRTs = fs.readFileSync('import-cypher/retweets_import.cypher').toString();
const importQuotes = fs.readFileSync('import-cypher/quotes_import.cypher').toString();

// This part is super important -- tweet IDs are longs, *not* ints.
// This gets lost in data conversion.  We need to always identify by the string
// value, not by the long value because of the loss.
// Not so easy to do this in cypher so I'm monkeypatching the data here.
const fixChunk = buffer =>
    buffer.map(line => JSON.parse(line))
        .map(tweet => {
            tweet.user.id = tweet.user.id_str || '' + tweet.user.id;

            if (tweet.retweeted_status) {
                tweet.retweeted_status.user.id = tweet.retweeted_status.user.id_str || '' + tweet.retweeted_status.user.id;
            }

            if (tweet.quoted_status) {
                tweet.quoted_status.user.id = tweet.quoted_status.user.id_str || '' + tweet.quoted_status.user.id;
            }

            return tweet;
        });

async function processBuffer(driver) {
    batch++;
    if (lineBuffer.length === 0) {
        console.log('Skipping empty buffer');
        return Promise.resolve(null);
    }

    console.log('Processing batch ', batch, ' of ', lineBuffer.length);
    const session = driver.session();

    const goldCopy = { tweetArr: fixChunk(lineBuffer) };

    return session.run(importTweets, _.cloneDeep(goldCopy))
        .then(() => session.run(importRTs, _.cloneDeep(goldCopy)))
        .then(() => session.run(importQuotes, _.cloneDeep(goldCopy)))
        .then(() => {
            // reset buffer.
            lineBuffer = [];
            console.log('Cypher session finished');
            session.close();
        });
}

async function processFile(file, driver) {
    return new Promise((resolve, reject) => {
        const lr = new LineByLineReader(file);

        lr.on('error', reject);

        lr.on('line', async function (line) {
            lineBuffer.push(line);

            if (lineBuffer.length >= BUF_SIZE) {
                // Pause resume I/O is critical to keep file IO from outrunning
                // DB ability to absorb.
                lr.pause();
                const s = new Date().getTime();
                // Heavy cypher lifting.
                await (processBuffer(driver));
                const e = new Date().getTime();
                console.log(`${BUF_SIZE} tweets in ${(e-s)}ms avg ${BUF_SIZE/(e-s)} rec/ms`);
                lr.resume();
            }
        });

        lr.on('end', () => {
            processBuffer(driver);
            resolve();
        });
    });
}

const setupIndexes = (driver) => {
    const statements = [
        'CREATE CONSTRAINT ON(ht: Hashtag) ASSERT ht.key IS UNIQUE;',
        'CREATE CONSTRAINT ON(location: Location) ASSERT location.name IS UNIQUE;',
        'CREATE CONSTRAINT ON(organization: Organization) ASSERT organization.name IS UNIQUE;',
        'CREATE CONSTRAINT ON(person: Person) ASSERT person.name IS UNIQUE;',
        'CREATE CONSTRAINT ON(source: Source) ASSERT source.name IS UNIQUE;',
        'CREATE CONSTRAINT ON(url: URL) ASSERT url.url IS UNIQUE;',
        'CREATE CONSTRAINT ON(media: Media) ASSERT media.id IS UNIQUE;',
        'CREATE CONSTRAINT ON(user: User) ASSERT user.id IS UNIQUE;',
        'CREATE CONSTRAINT ON(tweet: Tweet) ASSERT tweet.id IS UNIQUE;',
        'CREATE INDEX ON: Tweet(id);',
    ];

    return Promise.map(statements, stmt => {
        const s = driver.session();
        return s.run(stmt)
            .catch(err => {
                if (`${err}`.indexOf('already created') !== -1) {
                    // Ignore duplicate errors, who cares.
                    return null;
                } else {
                    throw err;
                }
            })
            .then(() => s.close());
    });
}

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const pass = process.env.NEO4J_PASSWORD;

const main = () => {
    const driver = neo4j.driver(uri,
        neo4j.auth.basic(user, pass));

    setupIndexes(driver)
        .then(() => processFile(yargs.argv.file, driver))
        .then(() => console.log('Done!'))
        .catch(err => console.error('Outer error', err))
        .then(() => driver.close());
};

main();