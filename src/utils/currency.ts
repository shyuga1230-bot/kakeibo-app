export function formatCurrency(amount: number, currency = 'JPY'): string {
  if (currency === 'JPY') {
    return `¥${amount.toLocaleString('ja-JP')}`;
  }
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(amount);
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ja-JP');
}
