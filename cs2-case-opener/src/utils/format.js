export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function formatFloat(value) {
  return Number(value).toFixed(6);
}

export function formatWearLabel(label) {
  return label || 'Unknown';
}
