import type { Issue, ParsedInvestorRecord } from '../types';
import { EPSILON } from './parser/rules';

export function validateRecords(records: ParsedInvestorRecord[]): Issue[] {
  const issues: Issue[] = [];
  const seenPerFile = new Map<string, Set<string>>();

  for (const r of records) {
    const key = r.fileName;
    if (!seenPerFile.has(key)) seenPerFile.set(key, new Set());
    const set = seenPerFile.get(key)!;
    if (set.has(r.investorId)) {
      issues.push({
        type: 'error',
        code: 'duplicate_investor',
        message: `Duplicate investor ID ${r.investorId}`,
        fileName: r.fileName,
        page: r.page,
        investorId: r.investorId
      });
    } else {
      set.add(r.investorId);
    }

    const b = r.beginningBalance ?? 0;
    const c = r.contributions ?? 0;
    const w = r.withdrawals ?? 0;
    const p = r.pnl ?? 0;
    const f = r.fees ?? 0;
    const e = r.endingBalance ?? 0;
    const lhs = b + c - w + p - f;
    if (Math.abs(lhs - e) > EPSILON) {
      issues.push({
        type: 'error',
        code: 'ending_mismatch',
        message: `Balance formula mismatch: expected ${lhs.toFixed(2)} got ${e.toFixed(2)}`,
        fileName: r.fileName,
        page: r.page,
        investorId: r.investorId
      });
    }
    // warnings for missing fields
    const required: (keyof ParsedInvestorRecord)[] = [
      'beginningBalance',
      'contributions',
      'withdrawals',
      'pnl',
      'fees',
      'endingBalance'
    ];
    for (const k of required) {
      if (r[k] === undefined) {
        issues.push({
          type: 'warning',
          code: 'missing_field',
          message: `Missing field: ${k}`,
          fileName: r.fileName,
          page: r.page,
          investorId: r.investorId
        });
      }
    }
  }

  return issues;
}


