import { useCallback, useEffect, useState } from "react"

type Quote = [number, number]

interface OrderBookResp {
  topic: string
  data: {
    asks: Quote[]
    bids: Quote[]
    prevSeqNum: number
    seqNum: number
    timestamp: number
    type: string
  }
}

interface DisplayQuote {
  price: number
  size: number
  total: number
  sizeChange: '+' | '-' | ''
  isNew: boolean
  percentage: number
}

const ORDER_BOOK_TOPIC = 'update:BTCPFC'
export const useOrderBook = () => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [bids, setBids] = useState<Quote[]>([])
  const [asks, setAsks] = useState<Quote[]>([])
  const [top8Bids, setTop8Bids] = useState<DisplayQuote[]>([])
  const [top8Asks, setTop8Asks] = useState<DisplayQuote[]>([])
  const [, setLastSeqNum] = useState<number | null>(null)

  useEffect(() => {
    const ws = new WebSocket('wss://ws.btse.com/ws/oss/futures')
    setWs(ws)

    return () => {
      console.log('Closing WebSocket connection')
      ws?.close()
    }
  }, [])

  const resubscribe = useCallback(() => {
    if (!ws) return
    // console.log('Resubscribing to WebSocket server')
    ws.send(JSON.stringify({
      op: 'unsubscribe',
      args: [ORDER_BOOK_TOPIC]
    }))
    ws.send(JSON.stringify({
      op: 'subscribe',
      args: [ORDER_BOOK_TOPIC]
    }))
  }, [ws])

  function assertIsOrderBookResp(data: unknown): data is OrderBookResp {
    return (data as OrderBookResp).topic === ORDER_BOOK_TOPIC
  }

  function updateQuotes(prev: Quote[], changes: Quote[]) {
    const map = new Map(prev.map(([p, s]) => [p, s]));
    for (const [price, size] of changes) {
      if (size === 0) {
        map.delete(price);
      } else {
        map.set(price, size);
      }
    }
    return Array.from(map.entries()) as Quote[];
  }

  const handleReceiveMessage = useCallback(async (event: MessageEvent) => {
    const resp = JSON.parse(event.data) as unknown

    if (!assertIsOrderBookResp(resp)) {
      return
    }

    const { type, asks, bids, seqNum, prevSeqNum } = resp.data

    setLastSeqNum((prev) => {
      if (prev && prevSeqNum && prevSeqNum !== prev) {
        resubscribe()
        return null
      }
      return seqNum
    })

    const updatedBids = type === 'snapshot' ? bids : updateQuotes(bids, asks);
    const updatedAsks = type === 'snapshot' ? asks : updateQuotes(asks, asks);


    const bestBid = Math.min(...updatedBids.map(([p]) => Number(p)));
    const bestAsk = Math.max(...updatedAsks.map(([p]) => Number(p)));

    if (bestBid >= bestAsk) {
      console.warn('Crossed book — reloading snapshot');
      resubscribe()
      return;
    }

    setBids(updatedBids)
    setAsks(updatedAsks)
  }, [resubscribe])

  useEffect(() => {
    if (!ws) return
    ws.onopen = () => {
      console.log('Connected to WebSocket server')
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [ORDER_BOOK_TOPIC]
      }))
    }
    ws.onmessage = handleReceiveMessage
  
    ws.onclose = () => {
      console.log('Disconnected from WebSocket server')
      ws.send(JSON.stringify({
        op: 'unsubscribe',
        args: [ORDER_BOOK_TOPIC]
      }))
    }
  }, [ws, handleReceiveMessage])


  function computedQuotes(
    prev: DisplayQuote[],
    quotes: Quote[],
    limit: number,
    type: 'asks' | 'bids'
  ): DisplayQuote[] {
    if (quotes.length === 0) return []
  
    const normalized = quotes
      .map(([p, s]) => [Number(p), Number(s)] as const)
      .sort((a, b) => b[0] - a[0]);
  
    const sliced = (type === 'bids' ? normalized.slice(0, limit) : normalized.slice(normalized.length - limit))
    const totalSize = sliced.reduce((acc, [, size]) => acc + Number(size), 0)
  
    let runningTotal = 0
  
    if (type === 'bids') {
      return sliced.map(([price, size]) => {
        runningTotal += Number(size);
        const prevQuote = prev.find((q) => q.price === price);
        return {
          price,
          size,
          total: runningTotal,
          percentage: totalSize === 0 ? 0 : (runningTotal / totalSize) * 100,
          sizeChange:
            prevQuote === undefined
              ? ''
              : size > prevQuote.size
              ? '+'
              : size < prevQuote.size
              ? '-'
              : '',
          isNew: prevQuote === undefined,
        };
      });
    } else {
      const result: DisplayQuote[] = [];
      const totalSize = sliced.reduce((acc, [, size]) => acc + Number(size), 0);

      for (let i = sliced.length - 1; i >= 0; i--) {
        const [price, size] = sliced[i];
        runningTotal += Number(size);
        const prevQuote = prev.find((q) => q.price === price);
        result.unshift({
          price,
          size,
          total: runningTotal,
          percentage: totalSize === 0 ? 0 : (runningTotal / totalSize) * 100,
          sizeChange:
            prevQuote === undefined
              ? ''
              : size > prevQuote.size
              ? '+'
              : size < prevQuote.size
              ? '-'
              : '',
          isNew: prevQuote === undefined,
        });
      }

      return result;
    }

  }

  useEffect(() => {
    setTop8Bids((prev) => computedQuotes(prev, bids, 8, 'bids'));
    setTop8Asks((prev) => computedQuotes(prev, asks, 8, 'asks'));
  }, [bids, asks]);

  return { top8Bids, top8Asks }
}