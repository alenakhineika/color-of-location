'use strict';

const convert = require('color-convert');
const { Duplex } = require('stream');
const http = require('http');
const https = require('https');
const MongoClient = require('mongodb').MongoClient;
const PImage = require('pureimage');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const bufferToStream = (myBuuffer) => {
  let tmp = new Duplex();

  tmp.push(myBuuffer);
  tmp.push(null);

  return tmp;
}

const SOURCE_IMAGE = process.env.SOURCE_IMAGE;
const LOCATION = process.env.LOCATION;
const MONGODB_ATLAS_CLUSTER_URI = process.env.MONGODB_ATLAS_CLUSTER_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION;

const getColor = (stream) => PImage.decodeJPEGFromStream(stream).then((img) => {
  const bitmap = PImage.make(400, 300);
  console.log('Bitmap created');

  const ctx = bitmap.getContext('2d');

  ctx.drawImage(img, 0, 0, img.width, img.height);
  console.log('Draw image completed');

  const data = ctx.getImageData(0, 0, img.width / 2, img.height / 2).data;
  console.log('Image data received');

  return [data[4], data[5], data[6]];
});

const run = () => {
  return new Promise((resolve) => {
    console.log('Lambda called according to schedule');
    console.log(`Fetch image from ${SOURCE_IMAGE}`);

    const sourceUrl = new URL(SOURCE_IMAGE);
    const get = sourceUrl.protocol === 'https:' ? https.get : http.get;

    const req = get(SOURCE_IMAGE, (res) => {
      if (res.statusCode == 200) {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          console.log('Fetch image completed');

          const buf = Buffer.concat(chunks);

          if (process.env.NODE_ENV !== 'production') {
            fs.writeFile('output.png', buf, 'base64', (error) => {
              if (error) throw error;

              console.log('Output png updated');
            });
          }

          const colorRGB = await getColor(bufferToStream(buf));
          console.log('Get color completed');

          const colorHex = convert.rgb.hex(colorRGB);
          const colorName = convert.rgb.keyword(colorRGB);

          try {
            await saveToMongoDB(colorName, colorHex);
            return resolve(true);
          } catch (error) {
            console.error('MongoDB Error', error.message);
            return resolve(false);
          }
        });
      } else {
        console.error('Error fetching image from source', res.statusCode);
        return resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('Request Error', error.message);
      return resolve(false);
    });
  });
};

const saveToMongoDB = async (colorName, colorHex) => {
  const client = new MongoClient(MONGODB_ATLAS_CLUSTER_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  console.log(`Connected to MongoDB`);

  const database = client.db(MONGODB_DATABASE);
  const collection = database.collection(MONGODB_COLLECTION);

  await collection.insertOne({
    created_at: new Date(),
    location: LOCATION,
    colorName,
    colorHex
  });
  console.log(`Data saved to MongoDB '${MONGODB_DATABASE}.${MONGODB_COLLECTION}'`);

  await client.close();
  console.log(`Connection closed`);
};

module.exports.handler = run;
