import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ParsedInvestorRecord } from '../types';
import { validateRecords } from '../lib/validate';
import { utils as XLSXUtils, writeFile as xlsxWriteFile } from 'xlsx';
import { useT } from '../i18n';

type SortKey = keyof Pick<ParsedInvestorRecord, 'investorId' | 'beginningBalance' | 'contributions' | 'withdrawals' | 'pnl' | 'fees' | 'endingBalance'>;

export const RecordsTable: React.FC = () => {
  const records = useAppStore((s) => s.records);
  const issues = useAppStore((s) => s.issues);
  const setData = useAppStore((s) => s.setData);
  const updateRecord = useAppStore((s) => s.updateRecord);
  const t = useT();

  const [showOnlyProblematic, setShowOnlyProblematic] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('investorId');
  const [sortAsc, setSortAsc] = useState(true);

  const problematicIds = useMemo(() => new Set(issues.filter(i => i.type === 'error' && i.investorId).map(i => `${i.fileName}:${i.page}:${i.investorId}`)), [issues]);

  const sorted = useMemo(() => {
    const copy = [...records];
    copy.sort((a, b) => {
      const av = (a[sortKey] as any) ?? '';
      const bv = (b[sortKey] as any) ?? '';
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [records, sortKey, sortAsc]);

  const visible = useMemo(() => sorted.filter(r => !showOnlyProblematic || problematicIds.has(`${r.fileName}:${r.page}:${r.investorId}`)), [sorted, showOnlyProblematic, problematicIds]);

  const exportCSV = () => {
    const header = ['fileName','page','investorId','beginning','contributions','withdrawals','pnl','fees','ending'];
    const rows = records.map(r => [r.fileName, r.page, r.investorId, r.beginningBalance, r.contributions, r.withdrawals, r.pnl, r.fees, r.endingBalance]);
    const csv = [header, ...rows].map(r => r.map(v => v ?? '').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'records.csv';
    a.click();
  };

  const exportXLSX = () => {
    const data = records.map(r => ({
      fileName: r.fileName,
      page: r.page,
      investorId: r.investorId,
      beginning: r.beginningBalance,
      contributions: r.contributions,
      withdrawals: r.withdrawals,
      pnl: r.pnl,
      fees: r.fees,
      ending: r.endingBalance
    }));
    const ws = XLSXUtils.json_to_sheet(data);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Records');
    xlsxWriteFile(wb, 'records.xlsx');
  };

  const exportIssues = () => {
    const data = issues.map(i => ({type: i.type, code: i.code, message: i.message, fileName: i.fileName, page: i.page ?? '', investorId: i.investorId ?? ''}));
    const ws = XLSXUtils.json_to_sheet(data);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Issues');
    xlsxWriteFile(wb, 'issues.xlsx');
  };

  const onInlineEdit = (r: ParsedInvestorRecord, key: keyof ParsedInvestorRecord, value: string) => {
    const num = value === '' ? undefined : Number(value);
    const id = `${r.fileName}:${r.page}:${r.investorId}`;
    if (key === 'investorId') {
      updateRecord(id, { investorId: value });
    } else if (!Number.isNaN(num!)) {
      updateRecord(id, { [key]: num } as any);
      // recompute issues
      const newIssues = validateRecords(useAppStore.getState().records);
      setData(useAppStore.getState().records, newIssues);
    }
  };

  const HeaderCell = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-2 py-1 cursor-pointer select-none" onClick={() => { if (sortKey === k) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(true); } }}>
      <span>{label}</span>
    </th>
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={showOnlyProblematic} onChange={(e) => setShowOnlyProblematic(e.target.checked)} />
          {t.onlyProblematic}
        </label>
        <button className="border px-2 py-1 rounded" onClick={exportCSV}>{t.exportCSV}</button>
        <button className="border px-2 py-1 rounded" onClick={exportXLSX}>{t.exportXLSX}</button>
        <button className="border px-2 py-1 rounded" onClick={exportIssues}>{t.issues}</button>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <HeaderCell k="investorId" label={t.tableHeaders.investorId} />
              <HeaderCell k="beginningBalance" label={t.tableHeaders.beginning} />
              <HeaderCell k="contributions" label={t.tableHeaders.contributions} />
              <HeaderCell k="withdrawals" label={t.tableHeaders.withdrawals} />
              <HeaderCell k="pnl" label={t.tableHeaders.pnl} />
              <HeaderCell k="fees" label={t.tableHeaders.fees} />
              <HeaderCell k="endingBalance" label={t.tableHeaders.ending} />
              <th className="px-2 py-1">{t.tableHeaders.status}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, idx) => {
              const id = `${r.fileName}:${r.page}:${r.investorId}`;
              const hasError = issues.some(i => i.type === 'error' && i.investorId === r.investorId && i.fileName === r.fileName && i.page === r.page);
              return (
                <tr key={id} className={idx % 2 ? 'bg-white/40' : ''}>
                  <td className="px-2 py-1">
                    <input className="w-40 border rounded px-1 py-0.5" defaultValue={r.investorId} onBlur={(e) => onInlineEdit(r, 'investorId', e.target.value)} aria-label="Investor ID" />
                  </td>
                  {(['beginningBalance','contributions','withdrawals','pnl','fees','endingBalance'] as const).map((k) => (
                    <td key={k} className="px-2 py-1">
                      <input className="w-28 border rounded px-1 py-0.5 text-right" defaultValue={r[k] ?? ''} onBlur={(e) => onInlineEdit(r, k, e.target.value)} aria-label={k} />
                    </td>
                  ))}
                  <td className="px-2 py-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${hasError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{hasError ? 'Error' : 'OK'}{r.edited ? ' • edited' : ''}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


