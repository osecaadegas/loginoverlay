export function formatCurrency(cents, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export function monthlyEquivalent(plan) {
  const months = Number(plan.intervalMonths);
  return Number.isFinite(Number(plan.priceCents)) && months > 0 ? Math.round(Number(plan.priceCents) / months) : null;
}

export function planSavings(plan, plans) {
  const monthly = plans.find(item => item.productType === plan.productType && item.currency === plan.currency && Number(item.intervalMonths) === 1 && item.active !== false);
  return monthly ? Math.max(0, monthly.priceCents * plan.intervalMonths - plan.priceCents) : 0;
}
