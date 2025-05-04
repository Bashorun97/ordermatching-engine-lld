// /**
//  * Order Book implementation for trading.
//  * Maintains lists of buy and sell orders sorted by price.
//  */
// export class OrderBook {
//     private bids: Order[] = []; // Buy orders, sorted by price in descending order
//     private asks: Order[] = []; // Sell orders, sorted by price in ascending order

//     /**
//      * Add a new order to the order book
//      * @param order The order to add
//      */
//     public addOrder(order: Order): void {
//         if (order.side === 'buy') {
//             this.insertOrder(this.bids, order, (a, b) => b.price - a.price);
//         } else {
//             this.insertOrder(this.asks, order, (a, b) => a.price - b.price);
//         }
//     }

//     /**
//      * Cancel an order from the order book
//      * @param orderId ID of the order to cancel
//      * @returns true if order was found and canceled, false otherwise
//      */
//     public cancelOrder(orderId: string): boolean {
//         let found = this.removeOrder(this.bids, orderId);
//         if (!found) {
//             found = this.removeOrder(this.asks, orderId);
//         }
//         return found;
//     }

//     /**
//      * Match new market order against the order book
//      * @param order Market order to execute
//      * @returns Array of executed trades
//      */
//     public matchOrder(order: MarketOrder): Trade[] {
//         const trades: Trade[] = [];
//         const ordersToMatch = order.side === 'buy' ? this.asks : this.bids;
        
//         let remainingQuantity = order.quantity;
        
//         while (remainingQuantity > 0 && ordersToMatch.length > 0) {
//             const matchedOrder = ordersToMatch[0];
//             const tradeQuantity = Math.min(remainingQuantity, matchedOrder.quantity);
            
//             trades.push({
//                 price: matchedOrder.price,
//                 quantity: tradeQuantity,
//                 buyer: order.side === 'buy' ? order.userId : matchedOrder.userId,
//                 seller: order.side === 'buy' ? matchedOrder.userId : order.userId,
//                 timestamp: Date.now()
//             });
            
//             remainingQuantity -= tradeQuantity;
//             matchedOrder.quantity -= tradeQuantity;
            
//             if (matchedOrder.quantity === 0) {
//                 ordersToMatch.shift();
//             }
//         }
        
//         return trades;
//     }

//     /**
//      * Get current best bid price
//      */
//     public getBestBid(): number | null {
//         return this.bids.length > 0 ? this.bids[0].price : null;
//     }

//     /**
//      * Get current best ask price
//      */
//     public getBestAsk(): number | null {
//         return this.asks.length > 0 ? this.asks[0].price : null;
//     }

//     /**
//      * Get order book depth up to specified level
//      */
//     public getDepth(levels: number = 10): OrderBookDepth {
//         return {
//             bids: this.aggregateOrders(this.bids, levels),
//             asks: this.aggregateOrders(this.asks, levels)
//         };
//     }

//     private insertOrder(orders: Order[], order: Order, compareFn: (a: Order, b: Order) => number): void {
//         // Find the correct position to insert the order
//         let index = 0;
//         while (index < orders.length && compareFn(orders[index], order) < 0) {
//             index++;
//         }
//         orders.splice(index, 0, order);
//     }

//     private removeOrder(orders: Order[], orderId: string): boolean {
//         const index = orders.findIndex(order => order.id === orderId);
//         if (index !== -1) {
//             orders.splice(index, 1);
//             return true;
//         }
//         return false;
//     }

//     private aggregateOrders(orders: Order[], levels: number): PriceLevel[] {
//         const aggregated: Map<number, number> = new Map();
        
//         for (const order of orders) {
//             const existing = aggregated.get(order.price) || 0;
//             aggregated.set(order.price, existing + order.quantity);
//         }
        
//         return Array.from(aggregated.entries())
//             .map(([price, quantity]) => ({ price, quantity }))
//             .slice(0, levels);
//     }
// }

// // Type definitions
// export interface Order {
//     id: string;
//     price: number;
//     quantity: number;
//     side: 'buy' | 'sell';
//     userId: string;
//     timestamp: number;
// }

// export interface MarketOrder {
//     userId: string;
//     quantity: number;
//     side: 'buy' | 'sell';
// }

// export interface Trade {
//     price: number;
//     quantity: number;
//     buyer: string;
//     seller: string;
//     timestamp: number;
// }

// export interface PriceLevel {
//     price: number;
//     quantity: number;
// }

// export interface OrderBookDepth {
//     bids: PriceLevel[];
//     asks: PriceLevel[];
// }