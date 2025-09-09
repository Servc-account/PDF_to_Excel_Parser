import React, { useCallback, useRef, useState } from 'react';

const DEFAULT_PROD = 'https://pdf-to-excel-parser-api.onrender.com';
const DEFAULT_LOCAL = 'http://localhost:8000';
const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || (isLocalHost ? DEFAULT_LOCAL : DEFAULT_PROD);

export const Upload: React.FC = () => {
  const [isDragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setProgress('Uploading…');
      const form = new FormData();
      for (let i = 0; i < files.length; i += 1) {
        const f = files.item(i);
        if (f) form.append('files', f, f.name);
      }
      const resp = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        body: form
      });
      if (!resp.ok) {
        const maybeJson = await resp.clone().json().catch(() => null);
        const detail = (maybeJson as any)?.detail || resp.statusText;
        throw new Error(String(detail));
      }
      setProgress('Downloading…');
      const blob = await resp.blob();
      const cd = resp.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename\*=UTF-8''([^;\n]+)|filename="?([^";\n]+)"?/i);
      const fileName = decodeURIComponent(m?.[1] || m?.[2] || 'FXP_merged_tables.xlsx');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
        className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragging ? 'border-blue-500' : 'border-muted'} focus:outline-none focus-visible:ring`}
        aria-label="Drop area"
        tabIndex={0}
      >
        <div className="mb-2">Drop PDFs here or click Upload</div>
        <button
          className="inline-flex items-center px-3 py-1.5 rounded-md border"
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


