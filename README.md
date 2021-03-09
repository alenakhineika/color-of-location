# Color of Location

> The [Color of Berlin](https://github.com/laurendorman/color-of-berlin) Twitter bot changed the source image what causes extreme colors in the timeline. This project fetches images of the sky from the [Institute for Meteorology of Free University of Berlin](http://www.met.fu-berlin.de/de/wetter/webcam/), extracts colors, and saves them directly to the database to supply [Color of Berlin Palette](https://github.com/alenakhineika/color-of-berlin-palette) with realistic color values.

The `Color of Location` is an AWS serverless application integrated with [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). It uses the `node-canvas` native module to get a dominant color from images, therefore to make it work with the AWS lambda function the project should be compiled on the Linux environment, and the `node-canvas` module should be pre-built and uploaded to AWS lambda layers.

## Install

Clone the project to your host machine.

```
> cd /Users/alenakhineika/www
> mkdir color-of-location
> cd color-of-location
> git clone git@github.com:alenakhineika/color-of-location.git .
```

Use [Docker](https://docs.docker.com/get-docker/) to run Ubuntu on MacOS and use [volumes](https://docs.docker.com/storage/volumes/) to share data between host and container.

```
> docker run -v /Users/alenakhineika/www:/home/www -it --rm ubuntu bash
```

Install wget, zip, unzip and [node](https://gist.github.com/d2s/372b5943bce17b964a79).

```
> apt-get update
> apt-get install wget zip unzip
> wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
```

Close and reopen your terminal to start using nvm or run the following to use it right away:

```
> export NVM_DIR="$HOME/.nvm"
 [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
 [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion bash_completion
```

The current example uses Node 12. The problem with Node 14 is that `node-canvas` binaries for this version exceed the allowed total lambda function size.

```
> nvm install 12
```

> TODO: Try to improve compression for Node 14 canvas binaries.

You can write your lambda function directly on AWS console or you can upload a zip archive with your compiled code and its dependencies. Lambda providesthe operating system and runtime for your function.

```
> cd home/www/color-of-location
> rm -rf node_modules package-lock.json code.zip
> npm i
> zip -r code.zip node_modules/ index.js package.json
```

`Node-canvas` requires a few packages like Cairo and Pango to be uploaded to the AWS lambda function. And these native libraries should be pre-compiled on an identical EC2 instance.

The [node-canvas-lambda](https://github.com/jwerre/node-canvas-lambda) provides binaries for Node 12 and a script to recompile the layers for different Node versions.

## To run locally

In the project root directory create the `.env` file from the `.env.example` file and specify all required values.

- SOURCE_IMAGE - The URL to the webcam image.
- LOCATION - The text name of the location.
- MONGODB_ATLAS_CLUSTER_URI - The connection string to the database.
- NODE_ENV - Set `production` for AWS Labmbda.

Call the lambda handler.

```
> node -e 'require("./index.js").handler()'
```

## To run with AWS Lambda

AWS will call `handler` automatically after you configure the lambda function following these steps:
- Create a lambda function.
- Add integration between Lambda and Atlas.
- Add environment variables.
- Upload `code.zip`, `node_canvas_layer.zip`, and `node_canvas_lib64_layer.zip` to Amazon S3, because zip files bigger than 10 MB. Note, that the total unzipped size of the function and all layers can't exceed the unzipped deployment package size limit of 250 MB.
- Crete `nodeCanvas` and `nodeCanvasLib64` layers from uploaded binaries and add them to your lambda function.
- Create `EventBridge` that triggers the lambda function according to schedule, e.g. `rate(1 hour)`.
- Change the amount of time that Lambda allows a function to run before stopping it. The default is 3 seconds, make it 20 seconds to make sure there is enough time to create a canvas and write to a database.
