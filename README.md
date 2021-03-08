# Color of Location

> The [Color of Berlin](https://github.com/laurendorman/color-of-berlin) Twitter bot changed the source image what causes extreme colors in the timeline. This project fetches images of the sky from the [Institute for Meteorology of Free University of Berlin](http://www.met.fu-berlin.de/de/wetter/webcam/), extracts colors, and saves them directly to the database to supply [Color of Berlin Palette](https://github.com/alenakhineika/color-of-berlin-palette) with realistic color values.

The `Color of Location` is an AWS serverless application integrated with [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). It uses the `node-canvas` native module to get a dominant color from images, therefore to make it work with the AWS lambda function the project should be compiled on the Linux environment, and the `node-canvas` module should be pre-built and uploaded to AWS lambda layers.

## Install

Clone the project to your host machine.

```
> cd /Users/alenakhineika/shared
> mkdir color-of-location
> cd color-of-location
> git clone git@github.com:alenakhineika/color-of-location.git .
```

Use [Docker](https://docs.docker.com/get-docker/) to run Ubuntu on MacOS and use [volumes](https://docs.docker.com/storage/volumes/) to share data between host and container.

```
> docker run -v /Users/alenakhineika/shared:/home -it --rm ubuntu bash
```

Install wget, zip, unzip and [node](https://gist.github.com/d2s/372b5943bce17b964a79).

```
> cd home
> apt-get update
> apt-get install wget zip unzip
```

You can write your lambda function directly on AWS console or you can upload a zip archive with your compiled code and its dependencies. Lambda providesthe operating system and runtime for your function.

```
> npm i
> zip -r code.zip node_modules/ index.js package.json
```

`Node-canvas` requires a few packages like Cairo and Pango to be uploaded to the AWS lambda function. And these native libraries should be pre-compiled on an identical EC2 instance.

The [node-canvas-lambda](https://github.com/jwerre/node-canvas-lambda) provides binaries for Node 12 and a script to recompile the layers for different Node versions. Make sure to run the script on Ubuntu to build binaries compatible with AWS Lambda that runs on Amazon's special flavor of Linux.

## To run locally

In the project root directory create the `.env` file from the `.env.example` file and specify all required values.

- SOURCE_IMAGE - The URL to the webcam image.
- LOCATION - The text name of the location.
- MONGODB_ATLAS_CLUSTER_URI - The connection string to the database.

Start the project.

```
> node index.js
```

## To run with AWS Lambda

The projects' root directory should contain the `index.js` file that exports your custom lanbda handler.

```js
const run = () => {
  /* ... */
};

exports.handler = run;
```

Configure AWS Lambda:
- Create a lambda function.
- Add integration between Lambda and Atlas.
- Add environment variables.
- Upload `code.zip`, `node_canvas_layer.zip`, and `node_canvas_lib64_layer.zip` to Amazon S3, because zip files bigger than 10 MB. Note, that the total unzipped size of the function and all layers can't exceed the unzipped deployment package size limit of 250 MB.
- Crete `nodeCanvas` and `nodeCanvasLib64` layers from uploaded binaries and add them to your lambda function.
- Create `EventBridge` that triggers the lambda function according to schedule, e.g. `rate(1 hour)`.
- Change the amount of time that Lambda allows a function to run before stopping it. The default is 3 seconds, make it 20 seconds to make sure there is enough time to create a canvas and write to a database.
