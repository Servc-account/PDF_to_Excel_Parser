import { utils as XLSXUtils, writeFile as xlsxWriteFile } from 'xlsx';
import type { ParseResult } from '../../types';
import { convertFinancialValue, normalizeWhitespace } from '../parser/normalize';
import { AREAS } from '../parser/rules';

type DataFrame = (string | number)[][];

function itemsInArea(items: { x: number; y: number; str: string }[], area: { left: number; top: number; right: number; bottom: number }): { x: number; y: number; str: string }[] {
  // pdfjs y grows upwards from bottom; our worker used transform[5] (text origin). The user's notebook coordinates seem top-origin.
  // Because lines grouping was based on raw y, we treat area using the same y baseline: approximate filtering by y within [bottom, top].
  return items.filter(it => it.x >= area.left && it.x <= area.right && it.y >= area.bottom && it.y <= area.top);
}

function buildTableFromItems(items: { x: number; y: number; str: string }[]): DataFrame {
  // naive row grouping by y and rough column split by x threshold
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const rows: { y: number; cells: { x: number; text: string }[] }[] = [];
  for (const it of sorted) {
    const row = rows.find(r => Math.abs(r.y - it.y) <= 2);
    if (row) {
      row.cells.push({ x: it.x, text: it.str });
    } else {
      rows.push({ y: it.y, cells: [{ x: it.x, text: it.str }] });
    }
  }
  // sort cells by x and join; collect up to 3 columns like notebook
  const table: DataFrame = rows.map(r => {
    const cells = r.cells.sort((a, b) => a.x - b.x).map(c => c.text);
    // join contiguous items into 3 buckets by rough x thresholds
    // We will simply create 3 columns by splitting joined text segments
    const joined = normalizeWhitespace(cells.join(' '));
    // heuristic: first token sequence (letters) then numeric columns extracted by last two numbers in line
    const numMatches = joined.match(/\(?[\d,]+\)?/g) || [];
    const lastTwo = numMatches.slice(-2);
    const lead = joined.replace(new RegExp(`${lastTwo.map(m => m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')}$`), '').trim();
    const col0 = lead;
    const col1 = lastTwo[0] ?? '';
    const col2 = lastTwo[1] ?? '';
    return [col0, col1, col2];
  });
  return table;
}

function filterByRowNames(df: DataFrame, firstRow: string, lastRow: string): DataFrame {
  const firstIdx = df.findIndex(r => String(r[0]) === String(firstRow));
  const lastIdx = df.findIndex(r => String(r[0]) === String(lastRow));
  if (firstIdx === -1 || lastIdx === -1 || lastIdx < firstIdx) return [];
  return df.slice(firstIdx, lastIdx + 1);
}

function toNumberColumn(col: (string | number)[]): number[] {
  return col.map(v => convertFinancialValue(v));
}

export interface FXPWorkbookSheets {
  merged_tables: any[];
  checks_summary: { file: string; lines: number; ytd: number; itd: number; diff: number }[];
  checks_investors: { fileId: string; docId: string; match: boolean; investorName: string }[];
  contribution_check: { file: string; commitment: number; contribution: number; called: number; contributionMinusCalled: number; uncalled: number; finalCheck: number }[];
}

export function buildFXPWorkbook(rawResults: ParseResult[]): FXPWorkbookSheets {
  const mergedTables: any[] = [];
  const checksSummary: FXPWorkbookSheets['checks_summary'] = [];
  const checksInvestors: FXPWorkbookSheets['checks_investors'] = [];
  const contributionCheck: FXPWorkbookSheets['contribution_check'] = [];

  for (const res of rawResults) {
    const page0Items = (res.items?.[0] ?? []);
    const balanceItems = itemsInArea(page0Items, AREAS.balance);
    const investorItems = itemsInArea(page0Items, AREAS.investor);

    const balanceTable = buildTableFromItems(balanceItems);
    // Convert 2nd and 3rd column to numbers
    const numeric1 = toNumberColumn(balanceTable.map(r => (r[1] ?? '')));
    const numeric2 = toNumberColumn(balanceTable.map(r => (r[2] ?? '')));
    // Replace in table
    balanceTable.forEach((r, i) => { r[1] = numeric1[i]!; r[2] = numeric2[i]!; });

    // Filter
    const filtered = filterByRowNames(balanceTable, 'Balance, beginning of period', 'Balance, end of period');
    const values1 = filtered.map(r => r[1] as number);
    const values2 = filtered.map(r => r[2] as number);
    const col1Sum = values1.slice(0, -1).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const col2Sum = values2.slice(0, -1).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const col1Value = values1[values1.length - 1] ?? 0;
    const col2Value = values2[values2.length - 1] ?? 0;
    const balanceCheck = (col1Value ?? 0) + (col2Value ?? 0) - col1Sum - col2Sum;

    mergedTables.push({ file: res.fileName, table: filtered });
    checksSummary.push({ file: res.fileName, lines: Math.max(filtered.length - 1, 0), ytd: col1Sum, itd: col2Sum, diff: balanceCheck });

    // Investor area: split by colon into key/value, mimic split_column_by_colon
    const investorText = investorItems.sort((a, b) => (b.y - a.y) || (a.x - b.x)).map(it => normalizeWhitespace(it.str));
    const investorRows = investorText.map(t => t.split(':', 2).map(s => s.trim()));
    // Expect 2 rows: 0 - Investor Name; 1 - Investor ID
    const investorName = investorRows[0]?.[1] ?? '';
    const investorIdDoc = investorRows[1]?.[1] ?? '';
    const safeFileName = (res.fileName ?? 'unknown.pdf');
    const filePrefix = safeFileName.replace(/\.pdf$/i, '');
    const fileId11 = filePrefix.slice(0, 11);
    checksInvestors.push({ fileId: fileId11, docId: investorIdDoc, match: fileId11 === investorIdDoc, investorName });

    // Contribution values: find four keywords in balance table region rows' first col
    const findValue = (label: string): number => {
      const row = (balanceTable.find(r => typeof r[0] === 'string' && (r[0] as string).toLowerCase().includes(label.toLowerCase())));
      if (!row) return Number.NaN;
      return convertFinancialValue(row[2]);
    };
    const totalCommitment = findValue('Total capital commitment');
    const contributionValue = findValue('Contribution');
    const calledValue = findValue('Capital called');
    const uncalledValue = findValue('Uncalled capital commitment');
    const contributionMinusCalled = (contributionValue ?? 0) - (calledValue ?? 0);
    const finalCheck = (totalCommitment ?? 0) - (calledValue ?? 0) - (uncalledValue ?? 0);
    contributionCheck.push({ file: res.fileName, commitment: totalCommitment, contribution: contributionValue, called: calledValue, contributionMinusCalled, uncalled: uncalledValue, finalCheck });
  }

  return {
    merged_tables: mergedTables,
    checks_summary: checksSummary,
    checks_investors: checksInvestors,
    contribution_check: contributionCheck
  };
}

export function exportFXPWorkbook(rawResults: ParseResult[], fileName = 'FXP_result.xlsx') {
  const sheets = buildFXPWorkbook(rawResults);
  const wb = XLSXUtils.book_new();

  // merged_tables: since notebook concatenates tables horizontally across files, we will add each as its own sheet and also a combined sheet
  const combinedRows: any[] = [];
  for (const mt of sheets.merged_tables) {
    const header = ['Row', 'Col1', 'Col2', 'Col3'];
    const rows = (mt.table as any[]).map(r => r);
    const ws = XLSXUtils.aoa_to_sheet([header, ...rows]);
    const sheetName = `${(mt.file ?? 'unknown').slice(0, 28)}`;
    XLSXUtils.book_append_sheet(wb, ws, sheetName);
    // For combined, prefix columns with file
    rows.forEach((r) => combinedRows.push([`${mt.file ?? 'unknown'}`, ...r]));
  }
  const combinedWs = XLSXUtils.aoa_to_sheet([['file','col1','col2','col3'], ...combinedRows]);
  XLSXUtils.book_append_sheet(wb, combinedWs, 'merged_tables');

  const checksSummaryWs = XLSXUtils.json_to_sheet(sheets.checks_summary);
  XLSXUtils.book_append_sheet(wb, checksSummaryWs, 'checks_summary');

  const checksInvestorsWs = XLSXUtils.json_to_sheet(sheets.checks_investors);
  XLSXUtils.book_append_sheet(wb, checksInvestorsWs, 'checks_investors');

  const contributionCheckWs = XLSXUtils.json_to_sheet(sheets.contribution_check);
  XLSXUtils.book_append_sheet(wb, contributionCheckWs, 'contribution_check');

  xlsxWriteFile(wb, fileName);
}


