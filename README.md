# Color of Location

The `Color of Location` is an AWS serverless application that can be integrated for example with [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). It fetches a `jpeg` image from the source URL, gets the image color, and saves data to MongoDB database.

The project was created from the [Color of Berlin](https://github.com/laurendorman/color-of-berlin) Twitter bot, that fetches images of the sky from a webcam in Berlin. Both projects require a static URL that servers different images to collect changing data. To demonstrate how it works I built another project that servers the [Unsplash random image](https://source.unsplash.com/random).

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

- SOURCE_IMAGE - A URL to the `jpeg` image.
- LOCATION - A text name of the location.
- MONGODB_ATLAS_CLUSTER_URI - A connection string to a database.
- MONGODB_DATABASE - The database name.
- MONGODB_COLLECTION - The collection name.
- NODE_ENV - Set `production` for AWS Labmbda.

Call the lambda handler.

```
> node -e 'require("./index.js").handler()'
```

## Run with AWS Lambda

AWS will call `handler` automatically after you configure the lambda function:
- Create a lambda function.
- Add integration between Lambda and Atlas via IAM roles.
- Add environment variables.
- Upload `code.zip` directly to the lambda function or to Amazon S3 if a zip file size is bigger than 10 MB. Note, that the total unzipped size of the function and all layers can't exceed the unzipped deployment package size limit of 250 MB.
- Create `EventBridge` that triggers Lambda according to schedule, e.g. `rate(1 hour)`.
- Change the amount of time that Lambda allows a function to run before stopping it. The default is 3 seconds, make it 20 seconds to make sure there is enough time to create a canvas and write to a database.
