import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Upload } from './components/Upload';
import { Issues } from './components/Issues';
import { RecordsTable } from './components/RecordsTable';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-4 space-y-6">
        <Upload />
        <Issues />
        <RecordsTable />
      </main>
      <Footer />
    </div>
  );
};


