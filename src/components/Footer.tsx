import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t p-4 text-sm text-muted-foreground flex items-center justify-between">
      <span>© {new Date().getFullYear()}</span>
      <span>v0.1.0</span>
    </footer>
  );
};


