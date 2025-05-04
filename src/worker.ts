// worker.js
import { parentPort, workerData } from 'worker_threads';

const { ticker } = workerData;

const MIN_PRICE = 90.0;
const MAX_PRICE = 110.0;
const TICK_SIZE = 10;
const PRICE_LEVELS = Math.round((MAX_PRICE - MIN_PRICE) / TICK_SIZE) + 1;

function priceToIndex(price: number): number {
  return Math.round((price - MIN_PRICE) / TICK_SIZE);
}

function indexToPrice(index: number): number {
  return MIN_PRICE + index * TICK_SIZE;
}

type Side = 'buy' | 'sell';

interface Order {
  orderId: string;
  price: number;
  quantity: number;
  timestamp: number;
  side: Side;
}

class OrderBookSide {
  levels: Order[][];
  orderMap: Map<string, { index: number; order: Order }>; // For quick cancel
  totalVolume: number;

  constructor(public side: Side) {
    this.levels = Array.from({ length: PRICE_LEVELS }, () => []);
    this.orderMap = new Map();
    this.totalVolume = 0;
  }

  insert(order: Order) {
    console.log('Inserting order:', order);
    const idx = priceToIndex(order.price);
    this.levels[idx].push(order);
    this.orderMap.set(order.orderId, { index: idx, order });
    console.log('OrderMap after insert:', [...this.orderMap.keys()]);
    this.totalVolume += order.quantity;
    console.log('Total volume after insert:', this.totalVolume);
  }

  cancel(orderId: string): boolean {
    console.log('Cancelling order:', orderId, this.orderMap);
    const entry = this.orderMap.get(orderId);
    console.log("Entry", entry);
    if (!entry) return false;

    
    const { index, order } = entry;
    const level = this.levels[index];
    const i = level.findIndex(o => o.orderId === orderId);
    if (i !== -1) {
      this.totalVolume -= level[i].quantity;
      level.splice(i, 1);
      this.orderMap.delete(orderId);
      return true;
    }
    return false;
  }

  matchLimitBuy(order: Order, askBook: OrderBookSide): Order[] {
    const fills: Order[] = [];
    const maxIndex = priceToIndex(order.price);

    for (let i = 0; i <= maxIndex && order.quantity > 0; i++) {
      const level = askBook.levels[i];
      while (level.length && order.quantity > 0) {
        const ask = level[0];
        const fillQty = Math.min(order.quantity, ask.quantity);
        fills.push({ ...ask, quantity: fillQty });

        ask.quantity -= fillQty;
        order.quantity -= fillQty;
        askBook.totalVolume -= fillQty;

        if (ask.quantity === 0) {
          askBook.orderMap.delete(ask.orderId);
          level.shift();
        }
      }
    }

    if (order.quantity > 0) this.insert(order);
    return fills;
  }

  matchLimitSell(order: Order, bidBook: OrderBookSide): Order[] {
    const fills: Order[] = [];
    const minIndex = priceToIndex(order.price);

    for (let i = PRICE_LEVELS - 1; i >= minIndex && order.quantity > 0; i--) {
      const level = bidBook.levels[i];
      while (level.length && order.quantity > 0) {
        const bid = level[0];
        const fillQty = Math.min(order.quantity, bid.quantity);
        fills.push({ ...bid, quantity: fillQty });

        bid.quantity -= fillQty;
        order.quantity -= fillQty;
        bidBook.totalVolume -= fillQty;

        if (bid.quantity === 0) {
          bidBook.orderMap.delete(bid.orderId);
          level.shift();
        }
      }
    }

    if (order.quantity > 0) this.insert(order);
    return fills;
  }

  getSnapshot(): any[] {
    return this.levels.map((orders, i) => ({ price: indexToPrice(i), orders }))
                     .filter(level => level.orders.length > 0);
  }
}

const bidBook = new OrderBookSide('buy');
const askBook = new OrderBookSide('sell');

parentPort!.on('message', (msg) => {
  const { type, workerId, orderId, order } = msg;

  if (type === 'getOrderBook') {
    const snapshot = {
      bids: bidBook.getSnapshot(),
      asks: askBook.getSnapshot()
    };
    parentPort!.postMessage({ workerId, data: snapshot });
  } else if (type === 'placeOrder') {
    let fills: Order[] = [];
    if (order.side === 'buy') {
      fills = bidBook.matchLimitBuy(order, askBook);
    } else {
        console.log('Matching limit sell', order);
      fills = askBook.matchLimitSell(order, bidBook);
    }
    parentPort!.postMessage({ workerId, data: { fills } });
  } else if (type === 'cancelOrder') {
    const cancelled = bidBook.cancel(orderId) || askBook.cancel(orderId);
    parentPort!.postMessage({ workerId, data: { cancelled } });
  }
});
