export function formatAutoDecimalInput(value) {
  const text = String(value ?? '');
  if (!text) return '';
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  const cents = digits.padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  return `${whole}.${cents.slice(-2)}`;
}
