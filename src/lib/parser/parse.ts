import { FIELD_ALIASES, NUMBER_REGEXPS } from './rules';
import { normalizeKey, parseLocaleNumber } from './normalize';
import type { ParsedInvestorRecord, ParseResult } from '../../types';

function matchAnyAlias(text: string, aliases: string[]): boolean {
  const t = normalizeKey(text);
  return aliases.some((a) => t.includes(a));
}

function findFirstNumberRight(lines: string[], startIdx: number): number | null {
  for (let i = startIdx; i < Math.min(lines.length, startIdx + 3); i += 1) {
    const line = lines[i];
    if (typeof line !== 'string') continue;
    for (const rx of NUMBER_REGEXPS) {
      const m = line.match(rx);
      if (m) {
        const n = parseLocaleNumber(m[0]);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

export function parsePagesToRecords(result: ParseResult): ParsedInvestorRecord[] {
  const records: ParsedInvestorRecord[] = [];

  result.pages.forEach((lines, pageIndex) => {
    if (!Array.isArray(lines)) return;
    let currentInvestorId: string | undefined = undefined;
    let current: ParsedInvestorRecord | null = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (typeof line !== 'string') continue;
      const key = normalizeKey(line);

      // investor id
      if (matchAnyAlias(key, FIELD_ALIASES.investorId ?? [])) {
        // try to find id on the same or next line as text
        const idCandidate = line.split(/[:\s]+/).pop();
        if (idCandidate && idCandidate.length >= 2) {
          currentInvestorId = idCandidate.trim();
        } else {
          // fallback: next line
          const next = typeof lines[i + 1] === 'string' ? (lines[i + 1] as string).trim() : undefined;
          if (next) currentInvestorId = next.split(/\s+/)[0];
        }
        current = {
          fileName: result.fileName,
          page: pageIndex + 1,
          investorId: (currentInvestorId ?? `unknown-${pageIndex + 1}-${i}`)
        } as ParsedInvestorRecord;
        records.push(current);
        continue;
      }

      if (!current) continue;

      const tryField = (
        field: keyof Omit<ParsedInvestorRecord, 'fileName' | 'page' | 'investorId' | 'edited'>,
        aliases: string[]
      ) => {
        if (matchAnyAlias(key, aliases)) {
          const num = findFirstNumberRight(lines, i);
          if (num !== null) {
            current![field] = num;
          }
        }
      };

      tryField('beginningBalance', FIELD_ALIASES.beginningBalance ?? []);
      tryField('contributions', FIELD_ALIASES.contributions ?? []);
      tryField('withdrawals', FIELD_ALIASES.withdrawals ?? []);
      tryField('pnl', FIELD_ALIASES.pnl ?? []);
      tryField('fees', FIELD_ALIASES.fees ?? []);
      tryField('endingBalance', FIELD_ALIASES.endingBalance ?? []);
    }
  });

  return records;
}


