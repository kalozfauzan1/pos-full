// Minimal shared utilities
export function formatCurrency(n) {
  return `$${(n || 0).toFixed(2)}`
}
export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'Z')
  const diff = (Date.now() - d.getTime()) / 60000
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return d.toLocaleDateString()
}
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
