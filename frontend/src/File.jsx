import React, { useState } from "react";
import axios from "axios";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [isUplaoding,setIsUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      //  set isuploading true
      setIsUploading(true);

      // check file size if it is less than 10MB
      if (file.size < 10000000) {
        // Call your API to get the presigned URL
        const response = await axios.post(
          "http://localhost:8080/generate-single-presigned-url",
          {
            fileName: file.name,
          }
        );
        const { url } = response.data;

        // Use the presigned URL to upload the file
        const uploadResponse = await axios.put(url, file, {
          headers: {
            "Content-Type": file.type,
          },
          
        });

        console.log("Uplaodresponse- ", uploadResponse);

        if (uploadResponse.status === 200) {
          alert("File uploaded successfully.");
        } else {
          alert("Upload failed.");
        }

        // set isUpload false
        setIsUploading(false);
      } else {
        // call multipart upload endpoint and get uploadId
        const response = await axios.post(
          "http://localhost:8080/start-multipart-upload",
          {
            fileName: file.name,
            contentType: file.type,
          }
        );

        // get uploadId
        let { uploadId } = response.data;
        console.log("UploadId- ", uploadId);

        // get total size of the file
        let totalSize = file.size;
        // set chunk size to 10MB
        let chunkSize = 10000000;
        // calculate number of chunks
        let numChunks = Math.ceil(totalSize / chunkSize);

        // generate presigned urls
        let presignedUrls_response = await axios.post(
          "http://localhost:8080/generate-presigned-url",
          {
            fileName: file.name,
            uploadId: uploadId,
            partNumbers: numChunks,
          }
        );

        let presigned_urls = presignedUrls_response?.data?.presignedUrls;

        console.log("Presigned urls- ", presigned_urls);

        // upload the file into chunks to different presigned url
        let parts = [];
        const uploadPromises = [];

        for (let i = 0; i < numChunks; i++) {
          let start = i * chunkSize;
          let end = Math.min(start + chunkSize, totalSize);
          let chunk = file.slice(start, end);
          let presignedUrl = presigned_urls[i];

          uploadPromises.push(
            axios.put(presignedUrl, chunk, {
              headers: {
                "Content-Type": file.type,
              },
            })
          );
        }

        const uploadResponses = await Promise.all(uploadPromises);

        uploadResponses.forEach((response, i) => {
          // existing response handling

          parts.push({
            etag: response.headers.etag,
            PartNumber: i + 1,
          });
        });

        console.log("Parts- ", parts);

        // make a call to multipart complete api
        let complete_upload = await axios.post(
          "http://localhost:8080/complete-multipart-upload",
          {
            fileName: file.name,
            uploadId: uploadId,
            parts: parts,
          }
        );

        console.log("Complete upload- ", complete_upload.data);
        // setFileUrl(complete_upload.data.fileUrl); 
        // if upload is successful, alert user
        if (complete_upload.status === 200) {
          // Fetch the URL to view the file
          const fileUrlResponse = await axios.get("http://localhost:8080/get-file-url", {
            params: {
              fileName: file.name,
            },
          });

          setFileUrl(fileUrlResponse.data.url);
          // alert("File uploaded successfully.");
        } else {
          alert("Upload failed.");
        }
        // set isUpload false
        setIsUploading(false);
      }
    } catch (error) {
      console.log(error)
      alert("Upload failed.");
    }
  };
  return (
    <div>
      <h1>Multipart Upload</h1>
      <br></br>
      {/* Input field to select file */}
      <input type="file" onChange={handleFileChange} name="file" id="myFile" /> 
      {/* Button to upload file */}
      <button onClick={handleUpload} disabled={isUplaoding} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
        {isUplaoding ? "Uploading..." : "Upload"}
      </button>
      {/* Display the uploaded file URL */}
      {fileUrl && (
        <div>
          <h3>Uploaded File:</h3>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            View File
          </a>
        </div>
      )}
    </div>
  );
}