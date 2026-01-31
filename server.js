import dotenv from 'dotenv';
import express from 'express';
import quotesHandler from './api/quotes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the current directory
app.use(express.static('.'));

// Proxy API requests to the handler
app.get('/api/quotes', async (req, res) => {
  await quotesHandler(req, res);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`- Frontend: http://localhost:${PORT}`);
  console.log(`- API:      http://localhost:${PORT}/api/quotes`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is in use. Please try another port.`);
    process.exit(1);
  } else {
    console.error(e);
  }
});
