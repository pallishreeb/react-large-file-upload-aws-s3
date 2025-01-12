const express = require("express");
const AWS = require("aws-sdk");
// const bodyParser = require("body-parser");

// get all the environment variable from .env file
require("dotenv").config();

// Create express app
const app = express();
const PORT = process.env.PORT || 8080;

// add body parser middleware for json
app.use(express.json());

// Handle CORS error
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

// AWS S3 config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: "v4",
});

// endpoint to check if API is live
app.get("/", (req, res) => {
  return res.status(200).send("API is live! 🎉😎");
});

// Generate single presigned url to upload file
app.post("/generate-single-presigned-url", async (req, res) => {
  try {
    const fileName = req.body.fileName;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Expires: 60, // Expires in 60 seconds
      ACL: "bucket-owner-full-control",
    };

    let url = await s3.getSignedUrlPromise("putObject", params);

    return res.status(200).json({ url });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Error generating presigned URL" });
  }
});

// endpoint to start multipart upload
app.post("/start-multipart-upload", async (req, res) => {
  // initialization
  let fileName = req.body.fileName;
  let contentType = req.body.contentType;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
  };

  // add extra params if content type is video
  if (contentType == "VIDEO") {
    params.ContentDisposition = "inline";
    params.ContentType = "video/mp4";
  }

  try {
    const multipart = await s3.createMultipartUpload(params).promise();
    res.json({ uploadId: multipart.UploadId });
  } catch (error) {
    console.error("Error starting multipart upload:", error);
    return res.status(500).json({ error: "Error starting multipart upload" });
  }
});

// Generate presigned url for each multiparts
app.post("/generate-presigned-url", async (req, res) => {
  // get values from req body
  const { fileName, uploadId, partNumbers } = req.body;
  const totalParts = Array.from({ length: partNumbers }, (_, i) => i + 1);
  try {
    const presignedUrls = await Promise.all(
      totalParts.map(async (partNumber) => {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileName,
          PartNumber: partNumber,
          UploadId: uploadId,
          Expires: 3600 * 3,
        };

        return s3.getSignedUrl("uploadPart", {
          ...params,
        });
      })
    );
    res.json({ presignedUrls });
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    return res.status(500).json({ error: "Error generating pre-signed URLs" });
  }
});

// Complete multipart upload
// app.post("/complete-multipart-upload", async (req, res) => {

//   // Req body
//   let fileName = req.body.fileName;
//   let uploadId = req.body.uploadId;
//   let parts = req.body.parts;

//   const params = {
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: fileName,
//     UploadId: uploadId,

//     MultipartUpload: {
//       Parts: parts.map((part, index) => ({
//         ETag: part.etag,
//         PartNumber: index + 1,
//       })),
//     },
//   };
//   try {
//     const data = await s3.completeMultipartUpload(params).promise();
//     res.status(200).json({ fileData: data });
//   } catch (error) {
//     console.error("Error completing multipart upload:", error);
//     return res.status(500).json({ error: "Error completing multipart upload" });
//   }
// });

// Complete multipart upload
app.post("/complete-multipart-upload", async (req, res) => {
  // Req body
  let fileName = req.body.fileName;
  let uploadId = req.body.uploadId;
  let parts = req.body.parts;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    UploadId: uploadId,

    MultipartUpload: {
      Parts: parts.map((part, index) => ({
        ETag: part.etag,
        PartNumber: index + 1,
      })),
    },
  };

  try {
    // Complete the multipart upload
    const data = await s3.completeMultipartUpload(params).promise();

    // Generate a URL to access the uploaded file
    const fileUrlParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Expires: 3600, // URL expiration time in seconds
    };
    const fileUrl = await s3.getSignedUrlPromise('getObject', fileUrlParams);

    // Return the response with file URL
    res.status(200).json({
      fileData: data,
      fileUrl: fileUrl // Include the URL in the response
    });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return res.status(500).json({ error: "Error completing multipart upload" });
  }
});

app.get("/get-file-url", async (req, res) => {
  try {
    const fileName = req.query.fileName;

    // Validate fileName
    if (!fileName) {
      return res.status(400).json({ error: "File name is required" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Expires: 60, // URL expires in 60 seconds
      ResponseContentDisposition: "inline" // This makes the browser try to display the file inline
    };

    const url = s3.getSignedUrl('getObject', params);

    return res.status(200).json({ url });
  } catch (err) {
    console.error("Error generating file URL:", err);
    return res.status(500).json({ error: "Error generating file URL" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} - http://localhost:${PORT}`);
});