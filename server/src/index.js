import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import marketRouter from './routes/market.js';
import authRouter from './routes/auth.js';
import portfolioRouter from './routes/portfolio.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:4173').split(',');

app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', marketRouter);
app.use('/api/auth', authRouter);
app.use('/api/portfolio', portfolioRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Investment Trainer market-data server listening on http://localhost:${PORT}`);
});
