export function shiftBusinessDay(day, amount) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!match || !Number.isInteger(amount)) return '';

  const shifted = new Date(0);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount);
  return [
    String(shifted.getUTCFullYear()).padStart(4, '0'),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function isValidBusinessDay(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day || '') && shiftBusinessDay(day, 0) === day;
}
