const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Determine if we're in development or production
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Get port from environment variable or default to 3001
const port = parseInt(process.env.PORT || '3001', 10);

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Let Next.js handle the request
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV}`);
    console.log(`> Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  });
}).catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
