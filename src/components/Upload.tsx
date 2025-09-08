import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ParseResult } from '../types';
import { useT } from '../i18n';
import { exportFXPWorkbook } from '../lib/fxp/export';

export const Upload: React.FC = () => {
  const t = useT();
  const [isDragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const worker = useMemo(() => new Worker(new URL('../lib/pdf/worker.ts', import.meta.url), { type: 'module' }), []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const rawResults: ParseResult[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const f = files.item(i);
      if (!f) continue;
      setProgress(`${f.name}`);
      const buf = await f.arrayBuffer();
      const parsed = await new Promise<ParseResult>((resolve, reject) => {
        const cleanup = () => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          worker.removeEventListener('messageerror', onMsgError);
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('Worker timeout'));
        }, 30000);
        const onMessage = (e: MessageEvent<any>) => {
          clearTimeout(timer);
          const data = e.data;
          if (data?.type === 'ready') {
            // worker alive; extend timeout and wait for result
            // re-arm timer for parsing duration
            const t2 = setTimeout(() => { cleanup(); reject(new Error('Worker timeout after ready')); }, 30000);
            // swap handler to wait for final message
            const finalHandler = (ev: MessageEvent<any>) => {
              clearTimeout(t2);
              cleanup();
              const d = ev.data;
              if (d?.error) reject(new Error(d.error));
              else resolve(d as ParseResult);
            };
            worker.removeEventListener('message', onMessage);
            worker.addEventListener('message', finalHandler);
            return;
          }
          cleanup();
          if (data?.error) reject(new Error(data.error));
          else resolve(data as ParseResult);
        };
        const onError = (e: ErrorEvent) => {
          clearTimeout(timer);
          cleanup();
          reject(new Error(e.message));
        };
        const onMsgError = () => {
          clearTimeout(timer);
          cleanup();
          reject(new Error('Worker messageerror'));
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError as any);
        worker.addEventListener('messageerror', onMsgError as any);
        // Transfer the ArrayBuffer to the worker to avoid a slow structured clone/copy
        worker.postMessage({ fileName: f.name, data: buf }, [buf]);
      });
      rawResults.push(parsed);
    }
    setProgress('');
    exportFXPWorkbook(rawResults, 'FXP_merged_tables.xlsx');
  }, [worker]);

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
        <div className="mb-2">{t.dropHere}</div>
        <button
          className="inline-flex items-center px-3 py-1.5 rounded-md border"
          onClick={() => inputRef.current?.click()}
          aria-label={t.uploadFiles}
        >{t.uploadFiles}</button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          multiple
          onChange={onChange}
        />
      </div>
      {progress && <div className="text-sm text-muted-foreground">{t.parsing} {progress}</div>}
    </div>
  );
};


