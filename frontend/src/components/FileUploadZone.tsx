import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface FileUploadZoneProps {
  onFileParsed: (data: string[][], headers: string[], fileName: string) => void;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileParsed }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          const headers = (result.meta.fields as string[]) || [];
          const dataAsObjects = result.data as Record<string, string>[];

          // --- FIXED: Convert array of objects to array of arrays ---
          const dataAsArrays = dataAsObjects.map(row => Object.values(row));
          // ---------------------------------------------------------
          
          if (dataAsArrays.length === 0) {
            alert("Error: Could not find any data rows in the CSV.");
            return;
          }
          
          onFileParsed(dataAsArrays, headers, file.name);
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