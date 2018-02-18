const Promise = require('bluebird');
const yargs = require('yargs').argv;
const _ = require('lodash');
const LanguageServiceClient = require('@google-cloud/language')
  .LanguageServiceClient;
const Translate = require('@google-cloud/translate');

// Creates a client
const language = new LanguageServiceClient();
const translate = new Translate();

console.log(yargs);
const text = yargs.tweet || 'American Airlines is the worst';

const getLanguage = txt =>
  translate.detect(txt)
    .then(results => {
      // console.log(JSON.stringify(results, null, 2));
      let detections = results[0];
      detections = Array.isArray(detections) ? detections : [detections];

      return detections.map(d => d.language);
      // console.log('Detections:');
      // detections.forEach(detection => {
      //   console.log(`${detection.input} => ${detection.language}`);
      // });  
    });

// Detects the sentiment of the document
const tweetalyze = txt =>
  getLanguage(txt)
    .then(langs => {
      if (langs.indexOf('ru') !== -1) {
        return { text: txt, languages: langs };
      }

      const apiArgs = {
        document: {
          content: txt,
          type: 'PLAIN_TEXT',
        },
      };

      return Promise.all([
        language.analyzeSentiment(apiArgs),
        language.analyzeEntities(apiArgs)])
        .then(([sentiments, entities]) => {
          // console.log(JSON.stringify(sentiments, null, 2));
          // console.log(JSON.stringify(entities, null, 2));
          const sentiment = sentiments[0].documentSentiment;
          // console.log(`Document sentiment:`);
          // console.log(`  Score: ${sentiment.score}`);
          // console.log(`  Magnitude: ${sentiment.magnitude}`);
          // const sentences = sentiments[0].sentences;
          // sentences.forEach(sentence => {
          //   console.log(`Sentence: ${sentence.text.content}`);
          //   console.log(`  Score: ${sentence.sentiment.score}`);
          //   console.log(`  Magnitude: ${sentence.sentiment.magnitude}`);
          // });
          return {
            text: txt,
            languages: langs,
            sentiment,
            entities: entities[0].entities.map(entityRef => {
              const ref = _.cloneDeep(entityRef);
              delete(ref.mentions);
              return ref;
            })
          };
        });
    })
    .catch(err => {
      console.error('ERROR:', err);
    });

tweetalyze(text).then(finalResult => console.log(JSON.stringify(finalResult, null, 2)))
    .catch(err => console.error('ZOMG: ', err));