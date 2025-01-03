const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to your service account key file
  projectId: process.env.GCP_PROJECT_ID, // Your Google Cloud Project ID
});

const bucketName = process.env.GCP_BUCKET_NAME; // Bucket name from environment variables
const bucket = storage.bucket(bucketName);

module.exports = bucket;