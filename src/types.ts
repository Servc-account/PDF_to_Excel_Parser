export type Locale = 'ru' | 'en';

export interface ParsedInvestorRecord {
  fileName: string;
  page: number;
  investorId: string;
  beginningBalance?: number;
  contributions?: number;
  withdrawals?: number;
  pnl?: number;
  fees?: number;
  endingBalance?: number;
  edited?: boolean;
}

export interface Issue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  fileName: string;
  page?: number;
  investorId?: string;
}

export interface ParseResult {
  fileName: string;
  pages: string[][]; // pages -> lines
}

export interface AppStateData {
  records: ParsedInvestorRecord[];
  issues: Issue[];
}


