import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  onFileParsed: (data: string[][], headers: string[], fileName: string) => void;
}

// --- Sanitizers ---
const sanitizeHeader = (h: string) =>
  (h ?? '')
    .replace(/^\uFEFF/, '')     // strip BOM
    .replace(/\u00A0/g, ' ')    // NBSP -> space
    .trim()
    .replace(/\s+/g, ' ');      // collapse spaces

const sanitizeCell = (v: any) => {
  if (v == null) return '';
  return String(v).replace(/\u00A0/g, ' ').trim();
};

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileParsed }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',                 // aggressively drop blank/whitespace-only rows
      transformHeader: sanitizeHeader,          // clean headers
      transform: sanitizeCell,                  // trim cells
      encoding: 'utf-8',
      delimitersToGuess: [',', '\t', ';', '|'], // be tolerant to delimiters
      complete: (result) => {
        // Papa often recovers even if there are parser warnings
        // console.warn(result.errors);

        const rawRows = (result.data as any[]) || [];
        // headers in original order from file meta
        const headers: string[] = (result.meta.fields as string[] || [])
          .map(sanitizeHeader)
          .filter(Boolean);

        if (!headers.length) {
          alert('Error: Could not detect headers in the CSV.');
          return;
        }

        // Keep only non-empty rows and map values in header order
        const dataRows: string[][] = rawRows
          .filter((r) => r && Object.values(r).some((v: any) => String(v ?? '').trim() !== ''))
          .map((r) => headers.map((h) => sanitizeCell(r[h])));

        if (!dataRows.length) {
          alert('Error: Could not find any data rows in the CSV.');
          return;
        }

        onFileParsed(dataRows, headers, file.name);
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        alert('Failed to parse CSV. Please check the file.');
      },
    });
  }, [onFileParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the file here …</p>
      ) : (
        <p>Drag & drop a CSV file here, or click to select one</p>
      )}
    </div>
  );
};

export default FileUploadZone;
