const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

/*
  Usage:
    node test_predict_video.js C:\Path\To\video.mp4
*/

(async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node test_predict_video.js C:\\path\\to\\video.mp4');
    process.exit(1);
  }

  const url = 'http://localhost:5000/predict-video';
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const res = await fetch(url, { method: 'POST', body: form });
    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request error:', err.message);
  }
})();
