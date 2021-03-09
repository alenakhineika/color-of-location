'use strict';

const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const canvas = require('canvas');
const Image = canvas.Image;
const createCanvas = canvas.createCanvas;
const convert = require('color-convert');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const MONGODB_DATABASE = 'coloroflocation';
const MONGODB_COLLECTION = 'colors';

const SLEEP_TIME = 60 * 60 * 1000;

const getColor = (src) => {
  const img = new Image();

  img.src = src;

  const canvas = createCanvas(400, 300);
  console.log('Canvas created');

  const ctx = canvas.getContext('2d');

  canvas.width = img.width;
  canvas.height = img.height;
  
  ctx.drawImage(img, 0, 0);
  console.log('Draw image completed');

  const data = ctx.getImageData(0, 0, img.width / 2, img.height / 2).data;
  console.log('Image data received');

  const color = [data[4], data[5], data[6]];

  return color;
};

const run = () => {
  return new Promise((resolve) => {
    console.log('Lambda function was called according to schedule');
    console.log(`Fetch image from ${process.env.SOURCE_IMAGE}`);

    const req = http.get(process.env.SOURCE_IMAGE, (res) => {
      if (res.statusCode == 200) {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          console.log('Image successfully fetched');

          const src = Buffer.concat(chunks);
          const colorRGB = getColor(src);

          console.log('Get color completed');

          const colorHex = convert.rgb.hex(colorRGB);
          const colorName = convert.rgb.keyword(colorRGB);

          await saveToMongoDB(colorName, colorHex);

          resolve(true);
        });
      } else {
        console.error('Error fetching image from source', res.statusCode);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('Request Error', error.message);
      resolve(false);
    });

    console.log(`Repeat fetch in ${Math.round(SLEEP_TIME / 60 / 1000)} minutes`);
  });
};

const saveToMongoDB = async (colorName, colorHex) => {
  const client = new MongoClient(process.env.MONGODB_ATLAS_CLUSTER_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log(`Connected to MongoDB client`);

    const database = client.db(MONGODB_DATABASE);
    const collection = database.collection(MONGODB_COLLECTION);
  
    await collection.insertOne({
      created_at: new Date(),
      location: process.env.LOCATION,
      colorName,
      colorHex
    });
    console.log(`Color saved to MongoDB '${MONGODB_DATABASE}.${MONGODB_COLLECTION}'`);
    await client.close();
    console.log(`Connection closed`);
  } catch (error) {
    console.error('MongoDB Error', error.message);
  }
};

exports.handler = run;

if (process.env.NODE_ENV !== 'production') {
  run();
}
