// In frontend/src/components/FileUploadZone.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  // The function will now pass the headers as well
  onFileParsed: (data: number[][], headers: string[], fileName: string) => void;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileParsed }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          // Capture the headers from the parse result
          const headers = result.meta.fields || [];
          const numericData = (result.data as Record<string, string>[])
            .map(row => Object.values(row).map(Number))
            .filter(row => row.every(val => !isNaN(val)));
          
          if (numericData.length === 0) {
            alert("Error: No valid numerical data rows were found in the CSV.");
            return;
          }
          
          onFileParsed(numericData, headers, file.name);
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  }, [onFileParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'] } 
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {
        isDragActive ?
          <p>Drop the file here ...</p> :
          <p>Drag 'n' drop a CSV file here, or click to select a file</p>
      }
    </div>
  );
};

export default FileUploadZone;