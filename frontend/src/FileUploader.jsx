import React, { useState } from 'react';
import axios from 'axios';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunk size

function FileUploader() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadChunk = async (chunk, chunkIndex, totalChunks) => {
    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('fileName', file.name);  // Send the file name to the backend

    try {
      await axios.post('http://localhost:8000/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((chunkIndex / totalChunks) * 100);
          setProgress(percentCompleted);
        },
      });
    } catch (error) {
      console.error('Error uploading chunk', error);
    }
  };

  const handleFileUpload = async () => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      await uploadChunk(chunk, i, totalChunks);
    }
    console.log('File upload complete!');
    setUploadedFileName(file.name); // Store the uploaded file name
  };

  const handleViewVideo = () => {
    // Set the video URL based on the uploaded file
    const url = `http://localhost:8000/videos/${uploadedFileName}`;
    setVideoUrl(url);
  };

  return (
    <div>
      <h1 className='mb-4'>Large file upload to server</h1>
      <input type="file" onChange={handleFileChange} />
      {file && (
        <>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleFileUpload}>
            Upload File ({Math.round(file.size / (1024 * 1024))} MB)
          </button>
          {progress > 0 && <p>Upload Progress: {progress}%</p>}
        </>
      )}

      {uploadedFileName && (
        <>
          <button className="bg-green-500 text-white py-2 px-4 rounded" onClick={handleViewVideo}>
            View Video
          </button>
        </>
      )}

      {videoUrl && (
        <div>
          <h3>Uploaded Video:</h3>
          <video width="600" controls>
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
