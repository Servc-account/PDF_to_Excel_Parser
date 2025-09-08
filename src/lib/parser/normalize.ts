export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeKey(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function parseLocaleNumber(raw: string): number | null {
  const s = raw.replace(/[$€£%\s]/g, '');
  const isNegative = /^\((.*)\)$/.test(s);
  const core = isNegative ? s.slice(1, -1) : s;

  // Two cases: 1) 1,234.56 (comma thousands, dot decimal) 2) 1.234,56 (dot thousands, comma decimal)
  const comma = core.lastIndexOf(',');
  const dot = core.lastIndexOf('.');

  let normalized = core;
  if (comma !== -1 && dot !== -1) {
    if (dot > comma) {
      // 1,234.56 -> remove commas
      normalized = core.replace(/,/g, '');
    } else {
      // 1.234,56 -> remove dots, replace comma with dot
      normalized = core.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (comma !== -1 && dot === -1) {
    // 1234,56 -> decimal comma
    normalized = core.replace(/,/g, '.');
  } else if (dot !== -1 && comma === -1) {
    // either thousands or decimal; assume decimal if only one dot and digits after it
    // leave as is
    normalized = core;
  }

  const n = Number(normalized);
  if (Number.isNaN(n)) return null;
  return isNegative ? -n : n;
}


