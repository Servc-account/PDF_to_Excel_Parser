import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="glass sticky top-0 z-20 mx-4 mt-4 rounded-xl border p-4 md:mx-8 md:mt-8 md:p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">PDF → Excel Parser</h1>
        <div className="text-sm text-muted-foreground">Backend mode</div>
      </div>
    </header>
  );
};


