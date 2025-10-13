import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import type { ProfileSummary } from '../types';

interface FileUploadZoneProps {
  /** Existing: raw rows/headers handoff (kept for backward compatibility) */
  onFileParsed: (data: string[][], headers: string[], fileName: string) => void;

  /** NEW (optional): if provided, we will POST to backend and return a computed ProfileSummary */
  onProfileReady?: (profile: ProfileSummary) => void;

  /** Optional: show errors to user */
  onError?: (msg: string) => void;

  /** Optional: max size (MB) */
  maxSizeMB?: number;

  /** Optional: toggle backend call for profiling (default: true if onProfileReady is provided) */
  useBackendProfile?: boolean;

  /** Optional: endpoint to POST { filename, tabular_data:{ headers, rows } } (default: '/profile-data') */
  profileEndpoint?: string;

  /** Optional: extra fetch options (e.g., credentials) */
  fetchOptions?: RequestInit;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileParsed,
  onProfileReady,
  onError,
  maxSizeMB = 20,
  useBackendProfile,
  profileEndpoint = '/profile-data',
  fetchOptions,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        onError?.(`File is too large (${sizeMB.toFixed(1)}MB). Max ${maxSizeMB}MB.`);
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          try {
            const headers = (result.meta.fields as string[]) || [];
            const rowsObj = result.data as Record<string, string>[];

            if (!headers.length || !rowsObj.length) {
              onError?.('Could not find headers/rows in the CSV.');
              return;
            }

            // Convert objects → array rows in same column order as headers
            const rows = rowsObj.map((r) => headers.map((h) => String(r[h] ?? '')));

            // 1) Always keep your original callback working
            onFileParsed(rows, headers, file.name);

            // 2) Optionally call backend to compute a ProfileSummary
            const shouldCallBackend = onProfileReady && (useBackendProfile ?? true);
            if (shouldCallBackend) {
              try {
                const resp = await fetch(profileEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    filename: file.name,
                    tabular_data: {
                      headers,
                      rows,
                    },
                  }),
                  ...fetchOptions,
                });

                if (!resp.ok) {
                  const txt = await resp.text().catch(() => '');
                  throw new Error(
                    `Profile API error (${resp.status}): ${txt || resp.statusText}`
                  );
                }

                const profile = (await resp.json()) as ProfileSummary;
                onProfileReady?.(profile);
              } catch (apiErr: any) {
                onError?.(
                  `Failed to generate profile on server: ${
                    apiErr?.message || String(apiErr)
                  }`
                );
                // Fall back gracefully: parent can still proceed using raw rows if desired.
              }
            }
          } catch (e: any) {
            onError?.(`Failed to parse CSV: ${e?.message || e}`);
          }
        },
        error: (err) => {
          onError?.(`CSV parse error: ${err.message}`);
        },
      });
    },
    [
      onFileParsed,
      onProfileReady,
      onError,
      maxSizeMB,
      profileEndpoint,
      useBackendProfile,
      fetchOptions,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      aria-label="Drag & drop CSV"
      style={{
        border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 28,
        textAlign: 'center',
        background: 'rgba(15,23,42,0.4)',
      }}
    >
      <input {...getInputProps()} />
      <div style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
          Drag & drop your CSV
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          or click anywhere in this box
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>
          (max {maxSizeMB} MB)
        </div>
      </div>
    </div>
  );
};

export default FileUploadZone;
