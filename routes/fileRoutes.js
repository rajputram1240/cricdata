const express = require('express');
const multer = require('multer');
const bucket = require('../config/googleCloudStorage');
const File = require('../models/file');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).send('Unable to upload file.');
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      
      // Save file metadata to MongoDB
      const fileRecord = new File({
        filename: req.file.originalname,
        bucket: bucket.name,
        path: blob.name,
      });
      await fileRecord.save();

      res.status(200).send({ message: 'File uploaded successfully', url: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('An error occurred.');
  }
});

module.exports = router;