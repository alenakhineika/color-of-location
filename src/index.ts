import chalk from 'chalk';
import http from 'http';
import { Image, createCanvas } from 'canvas';
import { MongoClient } from 'mongodb';

const convert = require('color-convert');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

type colorRGB = [number, number, number];

const MONGODB_URI = 'mongodb://localhost';
const MONGODB_DATABASE = 'coloroflocation';
const MONGODB_COLLECTION = 'colors';

const SLEEP_TIME = 60 * 60 * 1000;

const getColor = (src: Buffer): colorRGB => {
  const img = new Image();

  img.src = src;

  const canvas = createCanvas(400, 300);
  const ctx = canvas.getContext('2d');

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, img.width / 2, img.height / 2).data;
  const color: colorRGB = [data[4], data[5], data[6]];

  return color;
};

const loop = () => {
  console.log(chalk.green('Bot is running...'));
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
        const colorHex = convert.rgb.hex(colorRGB);
        const colorName = convert.rgb.keyword(colorRGB);

        saveToMongoDB(colorName, colorHex);
      });
    } else {
      console.error('Error fetching image from source', res.statusCode);
    }
  });

  req.on('error', (error) => {
    console.error('Request Error', error.message);
  });

  console.log(chalk.yellow(`Repeat fetch in ${Math.round(SLEEP_TIME / 60 / 1000)} minutes`));
  setTimeout(loop, SLEEP_TIME);
};

const saveToMongoDB = async (colorName: string, colorHex: string) => {
  const client: MongoClient = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();

  const database = client.db(MONGODB_DATABASE);
  const collection = database.collection(MONGODB_COLLECTION);

  await collection.insertOne({
    created_at: new Date(),
    text: `The color of the sky in ${process.env.LOCATION} is ${colorName}. #${colorHex}.`,
    colorName,
    colorHex
  });
  console.log(`Color saved to MongoDB '${MONGODB_DATABASE}.${MONGODB_COLLECTION}'`);
};

loop();
