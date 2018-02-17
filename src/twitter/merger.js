const Tweet = require('./Tweet');
const User = require('./User');

const merge = (tweet, session) =>
    session.run(tweet.mergeStatement())
        .subscribe({
            onNext: record => console.log('REC: ', record),
            onCompleted: session.close(),
            onError: error => console.error(error),
        });

export default {
    merge,
};