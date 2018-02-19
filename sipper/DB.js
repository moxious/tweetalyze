const MongoClient = require('mongodb').MongoClient;

const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'documents';

/** 
 * Simple object for gating access to a mongodb connection.
 */
class DB {
    /**
     * Make a new database object.
     * @param {*} url e.g. 'mongodb://localhost:27017'
     * @param {*} dbName e.g. 'twitter'
     */
    constructor(url, dbName) {
        if (!url) { throw new Error('must provide url'); }
        this.dbName = dbName;
        this.url = url;
        this.dbConnection = null;
        this.collection = null;
        this.client = null;
    }

    getConnection() { return this.dbConnection; }

    connect() {
        return MongoClient.connect(this.url)
            .then(client => {
                this.mongoClient = client;
                this.dbConnection = client.db(this.dbName);
                this.collection = this.dbConnection.collection(MONGO_COLLECTION);                          
            })
            .then(() => this);
    }

    disconnect() {
        if (this.mongoClient) {
            this.mongoClient.close();
        }

        this.dbConnection = null;
        this.colleciton = null;
        this.mongoClient = null;
    }
}

module.exports = DB;
