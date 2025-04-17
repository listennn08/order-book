import { useCallback, useEffect, useRef, useState } from "react"
import { DisplayQuote, OrderBookResp, Quote } from "../type"


const ORDER_BOOK_TOPIC = 'update:BTCPFC'
export const useOrderBook = () => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [bids, setBids] = useState<Quote[]>([])
  const [asks, setAsks] = useState<Quote[]>([])
  const [top8Bids, setTop8Bids] = useState<DisplayQuote[]>([])
  const [top8Asks, setTop8Asks] = useState<DisplayQuote[]>([])
  const lastSeqNum = useRef<number | null>(null)
  const pendingBids = useRef<Quote[]>([])
  const pendingAsks = useRef<Quote[]>([])

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

    const { type, asks: newAsks, bids: newBids, seqNum, prevSeqNum } = resp.data

    // Check sequence continuity
    if (lastSeqNum.current !== null && prevSeqNum !== lastSeqNum.current) {
      console.warn('[⚠️] Sequence mismatch, resubscribing...')
      resubscribe()
      lastSeqNum.current = null
      return
    }

    lastSeqNum.current = seqNum

    const bestBid = Math.min(...newBids.map(([p]) => Number(p)));
    const bestAsk = Math.max(...newAsks.map(([p]) => Number(p)));

    if (type === 'snapshot') {
      setBids(newBids)
      setAsks(newAsks)
      return
    }

    if (bestBid >= bestAsk) {
      console.warn('[❌] Crossed order book detected — resubscribing...')
      resubscribe()
      return
    }

    console.log('?')
    pendingBids.current.push(...newBids)
    pendingAsks.current.push(...newAsks)
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
  
    let result: DisplayQuote[] = []
    if (type === 'bids') {
      result = sliced.map(([price, size]) => {
        runningTotal += Number(size);
        const prevQuote = prev.find((q) => q.price.toFixed(1) === price.toFixed(1));
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
    }

    return result
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingBids.current.length > 0 || pendingAsks.current.length > 0) {
        setBids((prev) => updateQuotes(prev, pendingBids.current))
        setAsks((prev) => updateQuotes(prev, pendingAsks.current))
        pendingBids.current = []
        pendingAsks.current = []
      }
    }, 150)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setTop8Bids((prev) => computedQuotes(prev, bids, 8, 'bids'));
    setTop8Asks((prev) => computedQuotes(prev, asks, 8, 'asks'));
  }, [bids, asks]);

  return { top8Bids, top8Asks }
}