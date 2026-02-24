/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * Handles: "4642453780", "+14642453780", "1-464-245-3780", "(464) 245-3780", etc.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (raw.startsWith('+')) return raw;
  return `+${digits}`;
}

/**
 * Build all plausible format variants of a phone number for fuzzy DB matching.
 * Returns an array of unique strings to match against the contacts.phone column.
 */
export function phoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  if (!normalized) return [];
  const digits = raw.replace(/\D/g, '');
  const set = new Set<string>();
  set.add(normalized);           // +14642453780
  set.add(raw);                  // original value
  if (digits.length === 11 && digits[0] === '1') {
    set.add(digits);             // 14642453780
    set.add(digits.slice(1));    // 4642453780
  } else if (digits.length === 10) {
    set.add(digits);             // 4642453780
    set.add(`1${digits}`);       // 14642453780
  }
  return Array.from(set);
}
