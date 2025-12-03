const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function runTest() {
  try {
    const filePath = path.join(__dirname, '..', 'model', 'processed_test', 'F05', 'words', '01', '01', 'color_001.jpg');
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath));
    const url = 'http://localhost:5000/predict';
    const res = await axios.post(url, form, { headers: form.getHeaders(), timeout: 60000 });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error sending predict request:', err?.message || err);
    console.error('Full error object:', err);
    if (err.response) console.error('Response data:', err.response.data);
  }
}

runTest();
