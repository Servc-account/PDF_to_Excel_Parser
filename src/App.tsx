import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Upload } from './components/Upload';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden gap-2 p-2.5">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full opacity-60 blur-3xl bg-gradient-to-br from-indigo-400/40 via-purple-400/30 to-pink-400/30" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[40rem] h-[40rem] rounded-full opacity-50 blur-3xl bg-gradient-to-tr from-emerald-300/30 via-cyan-300/30 to-indigo-300/30" />

      <Header />
      <main className="flex-1">
        <Upload />
      </main>
      <Footer />
    </div>
  );
};


