const http = require('http');

const data = JSON.stringify({
  email: 'admin',
  password: '63d2a0f16b9751e319b767f1c558bf43'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
