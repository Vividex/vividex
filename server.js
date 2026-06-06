const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;

const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.png':'image/png', '.ico':'image/x-icon' };

http.createServer((req, res) => {
  let fp = path.join(root, req.url === '/' ? 'index.html' : req.url);
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(8743, '127.0.0.1', () => console.log('Server running at http://127.0.0.1:8743'));
