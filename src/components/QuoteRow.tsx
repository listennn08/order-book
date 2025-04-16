import { DisplayQuote } from "../type"
import { formatValue } from "../utils"

export const QuoteRow = ({data, type }: { data: DisplayQuote, type: 'asks' | 'bids' }) => {
  const { price, size, total, sizeChange, isNew, percentage } = data

  const color = type === 'asks' ? 'text-red-300' : 'text-green-300'
  const bgFlashColor = type === 'asks' ? 'bg-red-200' : 'bg-green-200'
  const bgAccumulativeColor = type === 'asks' ? 'bg-red-100' : 'bg-green-100'

  function getSizeClass() {
    if (sizeChange === '+') {
      return 'bg-green-100'
    } else if (sizeChange === '-') {
      return 'bg-red-100'
    }
    return ''
  }


  return (
    <div className={`grid grid-cols-3 hover:bg-blue-300 ${isNew ? bgFlashColor : ''} transition-all duration-100 ease-in-out`}>
      <div className={color}>
        {formatValue(price, true)}
      </div>
      <div className={`text-right ${getSizeClass()} transition-all duration-100 ease-in-out`}>
        {formatValue(size, false)}
      </div>
      <div className="text-right relative">
        <div className={`absolute inset-y-0 right-0 ${bgAccumulativeColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        {formatValue(total, false)}
      </div>
    </div>
  )
} 