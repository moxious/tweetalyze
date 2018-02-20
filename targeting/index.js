const yargs = require('yargs');
const request = require('request-promise');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const crypto = require('crypto');

// Usage:  node index.js --sources sources.json

const loadPartitionMap = file => {
    console.log('reading ', file);
    const content = fs.readFileSync(file);
    const partitionMap = JSON.parse(content);
    const sources = partitionMap.sources;

    if (!partitionMap.settings) {
        throw new Error('Partition map must have settings present');
    }

    if (!partitionMap.settings.partitions || 
        partitionMap.settings.filenames.length !== partitionMap.settings.partitions) {
        throw new Error('Partition map must have as many filenames as partitions');
    }

    if (!sources || !sources.length) {
        throw new Error('Partition map must have non-empty sources array');
    }

    // Must have all required keys
    const invalid = sources.filter(source => (!source.name || !source.url || 
        !source.partitionKey));

    if (invalid.length > 0) {
        throw new Error('Invalid source entries' + invalid);
    }

    return partitionMap;
};

const getSource = source =>
    request(source.url).then(data => parse(data, { columns: true }));

const partition = (partitionMap, allRecords) => {
    // Needs revisiting. We're partitioning things with different data
    // volumes (hashtags, accounts, topics).  That's why we round robin
    // and don't just put the first n into the first partition, because
    // you'd end up with a very high volume partition of all hashtags.

    // Init [ [], [], [] ]
    const partitions = _.range(partitionMap.settings.partitions).map(() => []);

    for (let i=0; i<allRecords.length; i++) {
        // Round robin
        const partitionIdx = i % partitionMap.settings.partitions;
        console.log(i + ' => ' + allRecords[i] + ' => ' + partitionIdx);
        partitions[partitionIdx].push(allRecords[i]);
    }

    return partitions;
};

const writePartitions = (partitionMap, partitions) => {
    const writtenFiles = [];
    partitions.forEach((partition, idx) => {
        const filename = partitionMap.settings.filenames[idx];
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

const loadSourceRecords = source =>
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
        });

const main = () => {
    if (!yargs.argv.map) {
        throw new Error('Call me with --map file.json');
    }

    const partitionMap = loadPartitionMap(yargs.argv.map);

    return Promise.map(partitionMap.sources, source => loadSourceRecords(source))
        .then(partitions => _.flatten(partitions))
        .then(allRecords => partition(partitionMap, allRecords))
        .then(partitions => writePartitions(partitionMap, partitions))
        .then(collectedFiles => console.log(collectedFiles))
        .catch(err => console.error('ERR', err));
};

main();