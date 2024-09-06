const express = require('express');
const fs = require('fs');
const cors = require("cors")
const path = require('path');
const app = express();


app.use(cors())

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const { chunkIndex, totalChunks, fileName } = req.body;
  const filePath = path.join(__dirname, 'uploads', fileName);

  // Append the chunk to the file in binary mode
  fs.appendFile(filePath, fs.readFileSync(req.file.path), (err) => {
    if (err) {
      return res.status(500).send('Error saving chunk');
    }

    // Clean up the temporary chunk file
    fs.unlinkSync(req.file.path);

    if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
      console.log('All chunks received. File upload complete.');
      // You can now mark the file upload as complete or process further
    }

    res.status(200).send('Chunk uploaded');
  });
});

// Serve uploaded video files
app.get('/videos/:fileName', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.fileName);
  res.sendFile(filePath);
});

app.get('/video/:fileName', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.fileName);
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4', // Set appropriate content type
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4', // Set appropriate content type
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.listen(8000, () => {
  console.log('Server started on port 8000');
});
