export const FIELD_ALIASES: Record<string, string[]> = {
  investorId: [
    'investor id',
    'investor:',
    'id:',
    'investor'
  ],
  capitalAccount: ['capital account', 'capital acct'],
  beginningBalance: ['beginning balance', 'begin bal', 'opening balance', 'balance, beginning'],
  endingBalance: ['ending balance', 'end bal', 'closing balance'],
  contributions: ['contributions', 'contribution'],
  withdrawals: ['withdrawals', 'distributions', 'withdrawal', 'distribution'],
  pnl: ['p&l', 'pnl', 'profit and loss', 'net gain/loss', 'net change'],
  fees: ['fees', 'management fees', 'fee']
};

export const NUMBER_REGEXPS: RegExp[] = [
  /\((?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?\)/, // (1,234.56) negative
  /(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?/ // 1,234.56 or 1.234,56 or 1234
];

export const EPSILON = 1e-6;

// FXP notebook area definitions (approximate PDF points)
export const AREAS = {
  balance: { left: 80, top: 590, right: 580, bottom: 300 },
  investor: { left: 100, top: 750, right: 500, bottom: 650 }
} as const;


