import { useCallback, useEffect, useState } from "react"

interface TradeHistoryResp {
  topic: string
  data: {
    price: number,
    size: number,
    side: "BUY" | "SELL",
    symbol: string,
    tradeId: number,
    timestamp: number
  }[]
}

interface LastPrice {
  price: number
  size: number
  side: "BUY" | "SELL"
  symbol: string
  tradeId: number
  timestamp: number
  priceChange: '+' | '-' | ''
}
export const useLastPrice = () => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [lastPrice, setLastPrice] = useState<LastPrice | null>(null)

  useEffect(() => {
    const ws = new WebSocket('wss://ws.btse.com/ws/futures')
    setWs(ws)

    return () => {
      ws.close()
    }
  }, [])

  function assertIsTradeHistoryResp(data: unknown): data is TradeHistoryResp {
    return (data as TradeHistoryResp).topic === 'tradeHistoryApi'
  }
  const handleReceiveMessage = useCallback((event: MessageEvent) => {
    const resp = JSON.parse(event.data) as unknown
    if (!assertIsTradeHistoryResp(resp)) {
      return
    }
    setLastPrice((prev) => {
      const last = resp.data[0]
      return {
        ...last,
        priceChange: (prev?.price === last.price || !prev) ? '' : last.price > prev?.price ? '+' : '-'
      }
    })
  }, [])

  useEffect(() => {
    if (!ws) return
    ws.onopen = () => {
      console.log('Connected to LastPrice WebSocket server')
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: ["tradeHistoryApi:BTCPFC"]
      }))
    }
    ws.onmessage = handleReceiveMessage
  
    ws.onclose = () => {
      console.log('Disconnected from WebSocket server')
      ws.send(JSON.stringify({
        op: 'unsubscribe',
        args: ["tradeHistoryApi:BTCPFC"]
      }))
    }
  }, [ws, handleReceiveMessage])


  return { lastPrice }
}