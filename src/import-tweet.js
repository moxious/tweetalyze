const yargs = require('yargs').argv;
const Tweet = require('./twitter/Tweet');
const User = require('./twitter/User');
const neo4j = require('neo4j-driver').v1;
const readline = require('readline');
const Promise = require('bluebird');

const url = process.env.NEO4J_URL || 'bolt://localhost';
const username = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'admin';

const driver = neo4j.driver(url, neo4j.auth.basic(username, password));

const importTweet = line => {    
    const j = JSON.parse(line);
    const t = new Tweet(j);

    const session = driver.session();
    return session.run(t.mergeStatement() + ' RETURN "success"')
        .then(data => {
            console.log('REC ', data[0]._fields);
        })
        .catch(err => {
            console.error(err);
        })
        .then(() => session.close());
};

// console.log(yargs);

if (yargs.stdin) {
    const rl = readline.createInterface({
        input: process.stdin,
    });

    rl.on('line', importTweet);
}