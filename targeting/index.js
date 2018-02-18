const yargs = require('yargs');
const request = require('request-promise');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const crypto = require('crypto');

const loadSources = file => {
    console.log('reading ', file);
    const content = fs.readFileSync(file);
    const sources = JSON.parse(content);

    // Must have all required keys
    const invalid = sources.filter(source => (!source.name || !source.url || 
        !source.partitionKey || !source.partitionSize));

    if (invalid.length > 0) {
        throw new Error('Invalid source entries' + invalid);
    }

    return sources;
};

const getSource = source =>
    request(source.url).then(data => parse(data, { columns: true }));

const writePartitions = (source, partitions) => {
    const writtenFiles = [];
    partitions.forEach((partition, idx) => {
        if (partition.length > source.partitionSize) {
            throw new Error('Something went wrong, partition too big!');
        }

        const filename = `${source.name}-${idx}.part.txt`;
        const hashFilename = `${filename}.sha`;
        const filedata = partition.join(',');
        
        // Write the partition text file, and a hash file for the partition to
        // disk.  By checking the hash, a program can know whether it has changed
        // or not without doing extra work.
        const sha256 = crypto.createHash('sha256').update(filedata).digest('hex');

        fs.writeFileSync(filename, filedata);
        fs.writeFileSync(hashFilename, sha256);

        writtenFiles.push(filename);
    });

    return writtenFiles;
};

const partition = source =>
    getSource(source)
        .then(records => {
            const count = records.length;
            const partitionKeyMap = {};

            // Build a list of unique, non-null, optionally case converted keys.
            // This tells us how many actual things was in the source set.
            const validPartitionKeys = _.uniq(records.map(rec => {
                if (!rec[source.partitionKey]) { return null; }

                if (source.caseInsensitive) {
                    return rec[source.partitionKey].toLowerCase();
                }

                return rec[source.partitionKey];
            }).filter(x => x));

            console.log('Found ', validPartitionKeys.length, 'in', count, 'source items');
            return validPartitionKeys;
        })
        // Chunk breaks it up into groups of partitionSize.
        .then(validPartitionKeys => _.chunk(validPartitionKeys, source.partitionSize));

const main = () => {
    if (!yargs.argv.sources) {
        throw new Error('Call me with --sources file.json');
    }

    const sources = loadSources(yargs.argv.sources);

    return partition(sources[0])
        .then(data => {
            console.log(data);
            return writePartitions(sources[0], data);
        })
        .then(data => console.log(data))
        .catch(err => console.error('ERR', err));

};

main();