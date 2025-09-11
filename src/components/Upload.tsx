import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parsePdfFiles, triggerDownload } from '../lib/api';
import { ProgressBar } from './ProgressBar';
const PARSING_TIME_PER_FILE = 12_000;

export const Upload: React.FC = () => {
  const [isDragging, setDragging] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [activeCount, setActiveCount] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setProgressLabel('Processing…');
      setCompleted(false);
      setActiveCount(files.length);
      const { blob, fileName } = await parsePdfFiles(files);
      setProgressLabel('Downloading…');
      setCompleted(true);
      triggerDownload(blob, fileName);
      setProgressLabel('');
      window.setTimeout(() => { setActiveCount(0); setCompleted(false); }, 400);
    } catch (e: any) {
      setProgressLabel(`Error: ${e?.message || String(e)}`);
      setActiveCount(0);
      setCompleted(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`glass-strong h-[30vh] flex flex-col items-center justify-center relative p-8 text-center transition ${isDragging ? 'ring-2 ring-indigo-400/60' : 'border-dashed'} focus:outline-none focus-visible:ring`}
        aria-label="Drop area"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(400px_200px_at_20%_20%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(400px_200px_at_80%_60%,rgba(236,72,153,0.12),transparent_60%)]" />
        <div className="relative mb-3 text-muted-foreground font-[600]">Drop PDFs here or click Upload</div>
        <button
          className="btn-glass btn-primary relative"
          onClick={() => inputRef.current?.click()}
          aria-label="Upload files"
        >Upload files</button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          multiple
          onChange={onChange}
        />
      </div>
      {(activeCount > 0 || progressLabel) && (
        <div className="space-y-1">
          <ProgressBar
            active={activeCount > 0}
            complete={completed}
            filesCount={activeCount}
            perFileMs={PARSING_TIME_PER_FILE}
            label={progressLabel || 'Processing…'}
          />
        </div>
      )}
    </div>
  );
};


