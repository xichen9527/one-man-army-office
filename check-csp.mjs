import http from 'node:http';
http.get('http://localhost:5175/one-man-army-office/', (res) => {
  console.log('Status:', res.statusCode);
  console.log('CSP:', res.headers['content-security-policy']);
  console.log('Content-Type:', res.headers['content-type']);
}).on('error', e => console.error(e));