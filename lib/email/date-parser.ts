// Parse "out of office" return dates from email text
// Handles: "back Monday", "out until Jan 5", "returning next week", "back on the 10th", "OOO until 3/15"
export function parseReturnDate(text: string, referenceDate?: Date): Date | null {
  const ref = referenceDate || new Date();
  const lower = text.toLowerCase();

  // Pattern 1: "back/returning on/until [date]"
  // e.g. "back January 5", "until March 10", "returning Jan 15"
  const monthDateMatch = lower.match(
    /(?:back|return|returning|until|till)\s+(?:on\s+)?(?:the\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i
  );
  if (monthDateMatch) {
    const monthNames: Record<string, number> = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11,
    };
    const month = monthNames[monthDateMatch[1].toLowerCase()];
    const day = parseInt(monthDateMatch[2]);
    if (month !== undefined && day >= 1 && day <= 31) {
      const result = new Date(ref.getFullYear(), month, day);
      if (result < ref) result.setFullYear(result.getFullYear() + 1); // next year if past
      return result;
    }
  }

  // Pattern 2: "back/until MM/DD" or "MM-DD"
  const slashDateMatch = lower.match(/(?:back|return|until|till)\s+(?:on\s+)?(\d{1,2})[\/\-](\d{1,2})/);
  if (slashDateMatch) {
    const month = parseInt(slashDateMatch[1]) - 1;
    const day = parseInt(slashDateMatch[2]);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const result = new Date(ref.getFullYear(), month, day);
      if (result < ref) result.setFullYear(result.getFullYear() + 1);
      return result;
    }
  }

  // Pattern 3: "back [day of week]" e.g. "back Monday", "returning Wednesday"
  const dayMatch = lower.match(/(?:back|return|returning)\s+(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (dayMatch) {
    const dayNames: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const targetDay = dayNames[dayMatch[1]];
    const currentDay = ref.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // next week
    const result = new Date(ref);
    result.setDate(result.getDate() + daysUntil);
    return result;
  }

  // Pattern 4: "back next week" or "next Monday"
  if (lower.includes('next week')) {
    const result = new Date(ref);
    result.setDate(result.getDate() + 7);
    // Move to Monday
    const day = result.getDay();
    const daysToMonday = day === 0 ? 1 : (8 - day);
    result.setDate(result.getDate() + daysToMonday - (day === 1 ? 0 : 0));
    return result;
  }

  // Pattern 5: "back on the Xth"
  const ordinalMatch = lower.match(/(?:back|return)\s+(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)/);
  if (ordinalMatch) {
    const day = parseInt(ordinalMatch[1]);
    const result = new Date(ref.getFullYear(), ref.getMonth(), day);
    if (result <= ref) {
      result.setMonth(result.getMonth() + 1); // next month
    }
    return result;
  }

  // Pattern 6: Generic OOO detection without specific date → default 7 days
  if (lower.match(/out\s+of\s+(the\s+)?office|ooo|on\s+vacation|on\s+holiday|away\s+from/)) {
    const result = new Date(ref);
    result.setDate(result.getDate() + 7);
    return result;
  }

  return null; // No OOO pattern detected
}
