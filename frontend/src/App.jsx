import React from 'react';
import FileUpload from './File';
import FileUploadServer from './FileUploader';

function App() {
  return (
    <div className="App">

      <FileUploadServer />
      <FileUpload />
    </div>
  );
}

export default App;
