/*
  Web Worker to parse PDF files using pdfjs-dist.
  Input: File bytes (ArrayBuffer) and fileName
  Output: { fileName, pages: string[][] }
*/

// Load pdfjs-dist lazily to surface import errors via postMessage
type PDFJSModule = typeof import('pdfjs-dist');
type DocumentInitParameters = any;

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
    self.postMessage({ type: 'ready', fileName });
    const mod: PDFJSModule = await import('pdfjs-dist');
    const workerUrl: string = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default as unknown as string;
    mod.GlobalWorkerOptions.workerSrc = workerUrl;
    const loadingTask = mod.getDocument({ data } as any);
    const pdf = await loadingTask.promise;
    const pages: string[][] = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const lines: string[] = [];
      // naive line grouping by y coordinate
      let currentY: number = 0;
      let hasY = false;
      let buffer: string[] = [];
      const items = (content.items as any[]) ?? [];
      for (const item of items) {
        const str = (item?.str as string) ?? '';
        const tr = (item?.transform as number[]) ?? [0,0,0,0,0,0];
        const y = Math.round(Number(tr[5] ?? 0));
        if (!hasY) {
          currentY = y;
          hasY = true;
          buffer.push(str);
          continue;
        }
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
    self.postMessage(out);
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};


