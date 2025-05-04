import express from 'express';
import { Request, Response } from 'express';

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
app.use(express.json());

const tickers = ['BTC-USD', 'ETH-USD'];
const workers = new Map<string, Worker>();
const responseHandlers = new Map<string, (data: any) => void>();

function generateMessageId(ticker: string) {
  return `${ticker}-${Date.now()}-${Math.random()}`;
}

// Spawn a worker per ticker
for (const ticker of tickers) {
  const worker = new Worker(path.join(__dirname, 'worker.js'), {
    workerData: { ticker }
  });

  worker.on('message', (msg) => {
    const cb = responseHandlers.get(msg.id);
    if (cb) {
      cb(msg.data);
      responseHandlers.delete(msg.id);
    }
  });

  workers.set(ticker, worker);
}

app.post('/order/:ticker', (req, res) => {
  const { ticker } = req.params;
  // console.log('Received order:', req.body);
  const worker = workers.get(ticker);
  if (!worker) {
    res.status(404).send('Ticker not found');
    return;
  }

  const id = generateMessageId(ticker);
  responseHandlers.set(id, (data) => res.json(data));
  const { orderId } = req.body;

  worker.postMessage({ type: 'placeOrder', id, orderId, order: req.body });
});

app.post('/cancel/:ticker/:orderId', (req: Request, res: Response) => {
  const { ticker, orderId } = req.params;
  const worker = workers.get(ticker);
  if (!worker) {
    res.status(404).send('Ticker not found');
    return;
  }

  const id = generateMessageId(ticker);
  responseHandlers.set(id, (data) => res.json(data));

  worker.postMessage({ type: 'cancelOrder', id, orderId });
});

app.get('/orderbook/:ticker', (req: Request, res: Response) => {
  const { ticker } = req.params;
  const worker = workers.get(ticker);
  if (!worker) {
    res.status(404).send('Ticker not found');
    return;
  }

  const id = generateMessageId(ticker);
  responseHandlers.set(id, (data) => res.json(data));

  worker.postMessage({ type: 'getOrderBook', id });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
