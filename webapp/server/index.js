const express = require('express');
const cors = require('cors');
const quoteRouter = require('./routes/quote');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', quoteRouter);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Quote server running on http://localhost:${PORT}`);
});
