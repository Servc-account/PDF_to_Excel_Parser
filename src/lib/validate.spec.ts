import { describe, it, expect } from 'vitest';
import { validateRecords } from './validate';

describe('validateRecords', () => {
  it('checks ending formula', () => {
    const issues = validateRecords([
      {
        fileName: 'f', page: 1, investorId: 'A',
        beginningBalance: 100, contributions: 20, withdrawals: 10, pnl: 5, fees: 2, endingBalance: 113
      }
    ]);
    expect(issues.find(i => i.code === 'ending_mismatch')).toBeFalsy();
  });

  it('detects mismatch', () => {
    const issues = validateRecords([
      {
        fileName: 'f', page: 1, investorId: 'A',
        beginningBalance: 100, contributions: 20, withdrawals: 10, pnl: 5, fees: 2, endingBalance: 100
      }
    ]);
    expect(issues.find(i => i.code === 'ending_mismatch')).toBeTruthy();
  });
});


