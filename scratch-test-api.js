const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/officials',
  method: 'GET',
  headers: {
    'x-admin-key': '123456'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data.substring(0, 1000));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
