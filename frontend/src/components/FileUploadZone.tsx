import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { VscCloudUpload } from 'react-icons/vsc';

interface FileUploadZoneProps {
  onFileParsed: (data: string[][], headers: string[], fileName: string) => void;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileParsed }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (result) => {
        const headers = (result.meta.fields as string[]) || [];
        const dataAsObjects = result.data as Record<string, string>[];
        const dataAsArrays = dataAsObjects.map(row => Object.values(row));
        if (dataAsArrays.length === 0) {
          alert('Error: Could not find any data rows in the CSV.');
          return;
        }
        onFileParsed(dataAsArrays, headers, file.name);
      },
      header: true,
      skipEmptyLines: true,
    });
  }, [onFileParsed]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
  });

  const error = fileRejections[0]?.errors[0]?.message;

  return (
    <div className={`dropzone fancy ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
      <input {...getInputProps()} />
      <div className="upload-hero">
        <div className="upload-icon"><VscCloudUpload size={34} /></div>
        <div className="upload-title">Drag & drop your CSV</div>
        <div className="upload-sub">or click to select a file (max 20MB)</div>
        {error ? <div className="upload-error">{error}</div> : null}
      </div>
    </div>
  );
};

export default FileUploadZone;
