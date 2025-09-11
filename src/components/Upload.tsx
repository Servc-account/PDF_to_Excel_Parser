import React, { useCallback, useRef, useState } from 'react';
import { parsePdfFiles, triggerDownload } from '../lib/api';

export const Upload: React.FC = () => {
  const [isDragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setProgress('Uploading…');
      const { blob, fileName } = await parsePdfFiles(files);
      setProgress('Downloading…');
      triggerDownload(blob, fileName);
      setProgress('');
    } catch (e: any) {
      setProgress(`Error: ${e?.message || String(e)}`);
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
      {progress && <div className="text-sm text-muted-foreground">{progress}</div>}
    </div>
  );
};


