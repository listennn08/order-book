
import { useLastPrice } from './hooks/useLastPrice'
import { useOrderBook } from './hooks/useOrderBook'
import IconArrowDown from './assets/IconArrowDown.svg?react'
import { QuoteRow } from './components/QuoteRow'
import { formatValue } from './utils'

function App() {
  const { top8Bids, top8Asks } = useOrderBook()
  const { lastPrice } = useLastPrice()

  return (
    <>
      <div className="px-2 max-w-xs mx-auto">
        <div className="border-b border-gray-200/10 font-bold leading-8">
          Order Book
        </div>
        <div>
          <div className="grid grid-cols-3">
            <div className="text-table-header">
              Price (USD)
            </div>
            <div className="text-table-header text-right">
              Size
            </div>
            <div className="text-table-header text-right">
              Total
            </div>
          </div>
          {top8Asks.map((ask, index) => (
            <QuoteRow key={`${ask.price.toFixed(1)}-${index}`} data={ask} type="asks" />
          ))}
          <div className={`flex items-center justify-center gap-x-1 font-bold text-center leading-8 ${lastPrice?.priceChange === '+' ? 'text-green-300 bg-green-100' : lastPrice?.priceChange === '-' ? 'text-red-300 bg-red-100' : 'bg-blue-200'}`}>
            {formatValue(lastPrice?.price || 0, true)}
            {lastPrice?.priceChange === '' ? null : <IconArrowDown className={`w-4 ${lastPrice?.priceChange === '+' ? 'rotate-180' : ''}`} />}
          </div>
          {top8Bids.map((bid, index) => (
            <QuoteRow key={`${bid.price.toFixed(1)}-${index}`} data={bid} type="bids" />
          ))}
        </div>
      </div>
    </>
  )
}

export default App
