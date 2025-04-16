
import { useLastPrice } from './hooks/useLastPrice'
import { useOrderBook } from './hooks/useOrderBook'
import IconArrowDown from './assets/IconArrowDown.svg?react'

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
          {top8Asks.map(({ price, size, total, sizeChange, isNew, percentage }) => (
            <div key={price} className={`grid grid-cols-3 hover:bg-blue-300 ${isNew ? 'bg-red-200' : ''} transition-all duration-100 ease-in-out`}>
              <div className="text-red-300">
                {Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 1 }).format(price)}
              </div>
              <div className={`text-right ${sizeChange === '+' ? 'bg-green-100' : sizeChange === '-' ? 'bg-red-100' : ''} transition-all duration-100 ease-in-out`}>
                {Intl.NumberFormat('en-US').format(size)}
              </div>
              <div className="text-right relative">
                <div className="absolute inset-y-0 right-0 bg-red-100" style={{ width: `${Math.min(percentage, 100)}%` }} />
                {Intl.NumberFormat('en-US').format(total)}
              </div>
            </div>
          ))}
          <div className={`flex items-center justify-center gap-x-1 font-bold text-center leading-8 ${lastPrice?.priceChange === '+' ? 'text-green-300 bg-green-100' : lastPrice?.priceChange === '-' ? 'text-red-300 bg-red-100' : 'bg-blue-200'}`}>
            {Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 1 }).format(lastPrice?.price || 0)}
            {lastPrice?.priceChange === '' ? null : <IconArrowDown className={`w-4 ${lastPrice?.priceChange === '+' ? 'rotate-180' : ''}`} />}
          </div>
          {top8Bids.map(({ price, size, total, sizeChange, isNew, percentage }) => (
            <div key={price} className={`grid grid-cols-3 hover:bg-blue-300 ${isNew ? 'bg-green-200' : ''} transition-all duration-100 ease-in-out`}>
              <div className="text-green-300">
                {Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 1 }).format(price)}
              </div>
              <div className={`text-right ${sizeChange === '+' ? 'bg-green-100' : sizeChange === '-' ? 'bg-red-100' : ''} transition-all duration-100 ease-in-out`}>
                {Intl.NumberFormat('en-US').format(size)}
              </div>
              <div className="text-right relative">
                <div className="absolute inset-y-0 right-0 bg-green-100" style={{ width: `${Math.min(percentage, 100)}%` }} />
                {Intl.NumberFormat('en-US').format(total)}
              </div>
            </div>
          ))}
          
        </div>
      </div>
    </>
  )
}

export default App
