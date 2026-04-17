import http from 'http';
http.get('http://localhost:3000/api/processes', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('BODY:', data); });
}).on('error', (e) => {
  console.error('ERROR:', e);
});
