import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass mx-4 mb-4 mt-auto rounded-xl border p-4 text-sm text-muted-foreground md:mx-8 md:mb-8">
      <div className="flex items-center justify-between">
        <span>© {new Date().getFullYear()}. All rights reserved. Powered by Orca</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
};


