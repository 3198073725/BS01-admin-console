export function fmtTime(val) {
  try {
    if (!val) return '-'
    const d = new Date(val)
    return d.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (_) {
    return String(val || '').slice(0, 16) || '-'
  }
}
