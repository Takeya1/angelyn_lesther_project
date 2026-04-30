const http = require('http');
http.get('http://localhost:3000/api/quote', (res) => {
  console.log(res.statusCode);
}).on('error', (e) => {
  console.log("Vite error:", e.message);
});
