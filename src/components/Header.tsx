import React from 'react';
import orcaUrl from '../svg/orca.svg';

export const Header: React.FC = () => {
  return (
    <header className="glass sticky top-0 z-20 rounded-xl border p-1 md:p-1.25">
      <div className="flex items-center justify-between">
        <h1 className="text-title-1 font-semibold">PDF → Excel Parser</h1>
        <img src={orcaUrl} alt="Orca" className="w-5" />
      </div>
    </header>
  );
};


