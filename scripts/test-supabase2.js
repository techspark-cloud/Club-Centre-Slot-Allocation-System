// Quick test - hit the student-status API endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/student-status',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('allocCounts keys:', Object.keys(json.allocCounts || {}).length);
      console.log('prefCounts keys:', Object.keys(json.prefCounts || {}).length);
      console.log('Response:', data.slice(0, 200));
    } catch(e) {
      console.log('Raw response:', data.slice(0, 200));
    }
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.end();
