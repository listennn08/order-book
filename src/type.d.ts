export type Quote = [number, number]

export interface OrderBookResp {
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

export interface DisplayQuote {
  price: number
  size: number
  total: number
  sizeChange: '+' | '-' | ''
  isNew: boolean
  percentage: number
}