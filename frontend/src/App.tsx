// In frontend/src/App.tsx
import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import './App.css';
import DataTable from './components/DataTable';
import DataChart from './components/DataChart';
import FeatureImportanceChart from './components/FeatureImportanceChart'; // Import the new chart

// Define a type for the feature importance data
interface ImportanceData {
  name: string;
  importance: number;
}

function App() {
  const [query, setQuery] = useState<string>('');
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tabularData, setTabularData] = useState<number[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  // NEW: State for the feature importance data
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Reset state on new file upload
    setInsight('');
    setFeatureImportances(null);
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse(file, {
        complete: (result) => {
          const numericData = (result.data as Record<string, string>[])
            .map(row => Object.values(row).map(Number))
            .filter(row => row.every(val => !isNaN(val)));
          
          if (numericData.length === 0) {
            alert("Error: No valid numerical data rows were found in the CSV.");
            setTabularData(null);
            setFileName('');
            return;
          }
          setTabularData(numericData);
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  };

  const handleSubmit = async () => {
    if (!tabularData) {
      alert('Please upload a CSV file first.');
      return;
    }
    if (!query.trim()) {
      alert('Please enter a query.');
      return;
    }
    
    setIsLoading(true);
    setInsight('');
    setFeatureImportances(null); // Clear previous importances

    const requestData = {
      tabular_data: tabularData,
      query: query,
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const response = await axios.post(apiUrl, requestData);
      
      // Set both the insight and the feature importances from the response
      setInsight(response.data.insight);
      setFeatureImportances(response.data.feature_importances);

    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setInsight(`Error from server: ${error.response.data.detail}`);
      } else {
        console.error("Error fetching insight:", error);
        setInsight('Sorry, an error occurred while talking to the brain.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>NEBULA AI Analyst</h1>
      <div className="card">
        <label htmlFor="file-upload" className="custom-file-upload">
          {fileName || 'Upload your CSV File'}
        </label>
        <input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} />
        
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about the data in your file..."
          rows={4}
          disabled={isLoading || !tabularData}
        />
        <button onClick={handleSubmit} disabled={isLoading || !tabularData}>
          {isLoading ? 'Thinking...' : 'Get Insight'}
        </button>
      </div>

      {/* Render the new Feature Importance chart when data is available */}
      {featureImportances && (
        <div className="card">
            <FeatureImportanceChart data={featureImportances} />
        </div>
      )}

      {insight && (
        <div className="card">
          <h2>Insight:</h2>
          <pre>{insight}</pre>
        </div>
      )}

      {tabularData && tabularData.length > 0 && (
        <div className="card">
            <DataChart data={tabularData} />
            <DataTable data={tabularData} />
        </div>
      )}
    </div>
  );
}

export default App;