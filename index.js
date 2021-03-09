'use strict';

const convert = require('color-convert');
const { Duplex } = require('stream');
const http = require('http');
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

const MONGODB_DATABASE = 'coloroflocation';
const MONGODB_COLLECTION = 'colors';

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
    console.log(`Fetch image from ${process.env.SOURCE_IMAGE}`);

    const req = http.get(process.env.SOURCE_IMAGE, (res) => {
      if (res.statusCode == 200) {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          console.log('Fetch image completed');

          const buf = Buffer.concat(chunks);

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
  const client = new MongoClient(process.env.MONGODB_ATLAS_CLUSTER_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  console.log(`Connected to MongoDB`);

  const database = client.db(MONGODB_DATABASE);
  const collection = database.collection(MONGODB_COLLECTION);

  await collection.insertOne({
    created_at: new Date(),
    location: process.env.LOCATION,
    colorName,
    colorHex
  });
  console.log(`Data saved to MongoDB '${MONGODB_DATABASE}.${MONGODB_COLLECTION}'`);

  await client.close();
  console.log(`Connection closed`);
};

module.exports.handler = run;
