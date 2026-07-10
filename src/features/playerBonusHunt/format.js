export function formatMoney(value = 0, currency = 'EUR') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatSignedMoney(value = 0, currency = 'EUR') {
  const amount = Number(value || 0);
  const formatted = formatMoney(Math.abs(amount), currency);
  if (amount > 0) return `+${formatted} Profit`;
  if (amount < 0) return `-${formatted} Loss`;
  return `${formatted} Even`;
}

export function formatMultiplier(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(2)}x`;
}

export function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function statusLabel(status) {
  const map = {
    trialing: 'Trial active',
    active: 'Active',
    payment_pending: 'Payment pending',
    past_due: 'Past due',
    canceled: 'Cancelled',
    cancelled: 'Cancelled',
    expired: 'Expired',
    incomplete: 'Payment pending',
    incomplete_expired: 'Expired',
    unpaid: 'Past due',
  };
  return map[status] || 'Not active';
}
