import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n';

export const Header: React.FC = () => {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = useT();
  return (
    <header className="border-b p-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <div className="flex items-center gap-2">
        <button className={`border px-2 py-1 rounded ${locale === 'ru' ? 'bg-muted' : ''}`} onClick={() => setLocale('ru')} aria-label="Русский">RU</button>
        <button className={`border px-2 py-1 rounded ${locale === 'en' ? 'bg-muted' : ''}`} onClick={() => setLocale('en')} aria-label="English">EN</button>
        <a
          href="https://github.com/your/repo"
          target="_blank"
          rel="noreferrer"
          className="underline"
          aria-label="GitHub repository"
        >
          GitHub
        </a>
      </div>
    </header>
  );
};


