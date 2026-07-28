import express from 'express';
import cors from 'cors';
import marketRouter from './routes/market.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', marketRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Investment Trainer market-data server listening on http://localhost:${PORT}`);
});
