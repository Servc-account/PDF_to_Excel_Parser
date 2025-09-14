export const DEFAULT_PROD = 'http://91.99.235.52';
export const DEFAULT_LOCAL = 'http://localhost:8000';

const isLocalHost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE_URL
  || (isLocalHost ? DEFAULT_LOCAL : DEFAULT_PROD);

export async function pingHealth(timeoutMs: number = 90_000): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    // Use no-cors so ping succeeds even if CORS isn't configured for /health
    await fetch(`${API_BASE}/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    }).catch(() => {});
    clearTimeout(timeout);
  } catch {
    // Swallow errors; this is best-effort keep-alive
  }
}

export interface ParseResultBlob {
  blob: Blob;
  fileName: string;
}

export async function parsePdfFiles(files: FileList | File[]): Promise<ParseResultBlob> {
  const form = new FormData();
  const toArray = Array.isArray(files) ? files : Array.from(files as FileList);
  for (const file of toArray) {
    if (file) form.append('files', file, file.name);
  }

  const resp = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    body: form
  });

  if (!resp.ok) {
    // Try to extract JSON error; fall back to status text
    let detail: unknown = resp.statusText;
    try {
      const maybeJson = await resp.clone().json();
      detail = (maybeJson as any)?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(String(detail));
  }

  const blob = await resp.blob();
  const cd = resp.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename\*=UTF-8''([^;\n]+)|filename="?([^";\n]+)"?/i);
  const fileName = decodeURIComponent(m?.[1] || (m?.[2] as string) || 'Parsed_files.xlsx');
  return { blob, fileName };
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


