import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass rounded-xl border p-1.25 text-sm text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>© {new Date().getFullYear()}. All rights reserved. Powered by Orca</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
};


