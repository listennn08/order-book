export function formatValue(value: number, isPrice: boolean) {
  if (isPrice) {
    return Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 1 }).format(value)
  }
  return Intl.NumberFormat('en-US').format(value)
}