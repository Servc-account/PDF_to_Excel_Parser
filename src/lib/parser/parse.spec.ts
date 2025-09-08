import { describe, it, expect } from 'vitest';
import { parsePagesToRecords } from './parse';
import type { ParseResult } from '../../types';

describe('parsePagesToRecords', () => {
  it('parses numbers with commas and parentheses', () => {
    const res: ParseResult = {
      fileName: 't.pdf',
      pages: [[
        'Investor ID: ABC123',
        'Beginning Balance 1,000.50',
        'Contributions 100',
        'Withdrawals (50)',
        'P&L 25.5',
        'Fees 10',
        'Ending Balance 1,066.00'
      ]]
    };
    const recs = parsePagesToRecords(res);
    expect(recs).toHaveLength(1);
    const r = recs[0]!;
    expect(r.investorId).toBe('ABC123');
    expect(r.beginningBalance).toBeCloseTo(1000.5);
    expect(r.withdrawals).toBeCloseTo(-50);
    expect(r.endingBalance).toBeCloseTo(1066);
  });
});


