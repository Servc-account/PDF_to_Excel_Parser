/*
  Web Worker to parse PDF files using pdfjs-dist.
  Input: File bytes (ArrayBuffer) and fileName
  Output: { fileName, pages: string[][] }
*/

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// pdfjs worker is not needed because we are already in a Web Worker context but suppress warning
// @ts-expect-error missing type in pdfjs for workerSrc in ESM
GlobalWorkerOptions.workerSrc = undefined;

export interface WorkerIn {
  fileName: string;
  data: ArrayBuffer;
}

export interface WorkerOut {
  fileName: string;
  pages: string[][];
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  try {
    const { data, fileName } = e.data;
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;
    const pages: string[][] = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const lines: string[] = [];
      // naive line grouping by y coordinate
      let currentY: number | null = null;
      let buffer: string[] = [];
      for (const item of content.items as any[]) {
        const str = item.str as string;
        const y = Math.round(item.transform[5]);
        if (currentY === null) currentY = y;
        if (Math.abs(y - currentY) > 2) {
          lines.push(buffer.join(' '));
          buffer = [str];
          currentY = y;
        } else {
          buffer.push(str);
        }
      }
      if (buffer.length) lines.push(buffer.join(' '));
      pages.push(lines);
    }
    const out: WorkerOut = { fileName, pages };
    (self as unknown as Worker).postMessage(out);
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: String(err) });
  }
};


