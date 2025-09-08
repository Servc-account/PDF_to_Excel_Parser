import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n';

export const Issues: React.FC = () => {
  const issues = useAppStore((s) => s.issues);
  const t = useT();
  const [onlyErrors, setOnlyErrors] = useState(false);

  const filtered = useMemo(() => issues.filter(i => !onlyErrors || i.type === 'error'), [issues, onlyErrors]);

  if (!issues.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t.issues}</h2>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
          {t.onlyProblematic}
        </label>
      </div>
      <div className="border rounded-md divide-y">
        {filtered.map((i, idx) => (
          <div key={idx} className="p-2 text-sm flex items-center justify-between">
            <div>
              <span className={i.type === 'error' ? 'text-red-600' : 'text-yellow-600'}>{i.type.toUpperCase()}</span>
              : {i.message}
            </div>
            <div className="text-muted-foreground">{i.fileName}{i.page ? ` p.${i.page}` : ''}{i.investorId ? ` — ${i.investorId}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
};


