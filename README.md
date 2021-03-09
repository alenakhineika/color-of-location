# Color of Location

> The [Color of Berlin](https://github.com/laurendorman/color-of-berlin) Twitter bot changed the source image what causes extreme colors in the timeline. This project fetches images of the sky from the [Institute for Meteorology of Free University of Berlin](http://www.met.fu-berlin.de/de/wetter/webcam/), extracts colors, and saves them directly to the database to supply [Color of Berlin Palette](https://github.com/alenakhineika/color-of-berlin-palette) with realistic color values.

The `Color of Location` is an AWS serverless application integrated with [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). It uses [node-pureimage](https://github.com/joshmarinacci/node-pureimage) instead of `node-canvas`, because `node-canvas` requires such dependencies as Cairo and Pango that have to be precompiled and uploaded to AWS lambda layers.

The [node-canvas-lambda](https://github.com/jwerre/node-canvas-lambda) provides binaries for Node 12 and a script to recompile the layers for different Node versions. But binaries for Node 14 became too large so it makes sense to replace `node-canvas` with `node-pureimage` that is a pure JavaScript implementation of the HTML Canvas 2d drawing API for NodeJS and it doesn't have native dependencies.

## Install

Clone the project to your host machine.

```
> git clone git@github.com:alenakhineika/color-of-location.git .
```

You can create lambda functions directly on the AWS console but if your function depends on external modules, you should precompile code together with dependencies and upload it as a zip file to AWS Lambda.

```
> npm i
> zip -r code.zip node_modules/ index.js package.json
```

## Run locally

In the project root directory create the `.env` file from the `.env.example` file and set all required values:

- SOURCE_IMAGE - The URL to the webcam image.
- LOCATION - The text name of the location.
- MONGODB_ATLAS_CLUSTER_URI - The connection string to the database.
- NODE_ENV - Set `production` for AWS Labmbda.

Call the lambda handler.

```
> node -e 'require("./index.js").handler()'
```

## Run with AWS Lambda

AWS will call `handler` automatically after you configure the lambda function following these steps:
- Create a lambda function.
- Add integration between Lambda and Atlas via IAM roles.
- Add environment variables.
- Upload `code.zip` directly to the lambda function or to Amazon S3 if a zip file size is bigger than 10 MB. Note, that the total unzipped size of the function and all layers can't exceed the unzipped deployment package size limit of 250 MB.
- Create `EventBridge` that triggers Lambda according to schedule, e.g. `rate(1 hour)`.
- Change the amount of time that Lambda allows a function to run before stopping it. The default is 3 seconds, make it 20 seconds to make sure there is enough time to create a canvas and write to a database.
