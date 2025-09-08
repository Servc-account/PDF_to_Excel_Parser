import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b p-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">PDF → Excel Parser</h1>
      <div className="text-sm text-muted-foreground">Backend mode</div>
    </header>
  );
};


