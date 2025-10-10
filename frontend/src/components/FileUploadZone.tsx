import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  onFileParsed: (data: string[][], headers: string[], fileName: string) => void;
  onError?: (msg: string) => void;
  maxSizeMB?: number;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileParsed,
  onError,
  maxSizeMB = 20,
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
        complete: (result) => {
          try {
            const headers = (result.meta.fields as string[]) || [];
            const rowsObj = result.data as Record<string, string>[];

            if (!headers.length || !rowsObj.length) {
              onError?.('Could not find headers/rows in the CSV.');
              return;
            }

            // Convert objects → array rows in the same column order as headers
            const rows = rowsObj.map((r) => headers.map((h) => String(r[h] ?? '')));

            onFileParsed(rows, headers, file.name);
          } catch (e: any) {
            onError?.(`Failed to parse CSV: ${e?.message || e}`);
          }
        },
        error: (err) => {
          onError?.(`CSV parse error: ${err.message}`);
        },
      });
    },
    [onFileParsed, onError, maxSizeMB]
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
