import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import './App.css';
import DataTable from './components/DataTable';
import DataChart from './components/DataChart';

function App() {
  const [query, setQuery] = useState<string>('');
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tabularData, setTabularData] = useState<number[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      Papa.parse(file, {
        complete: (result) => {
          const numericData = (result.data as Record<string, string>[])
            .map(row => Object.values(row).map(Number))
            .filter(row => row.every(val => !isNaN(val)));
          
          if (numericData.length === 0) {
            alert("Error: No valid numerical data rows were found in the CSV. Please check the file for text or empty rows.");
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

    const requestData = {
      tabular_data: tabularData,
      text_data: ["Sales are trending upwards.", "Customer feedback has been positive."],
      query: query,
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const response = await axios.post(apiUrl, requestData);
      setInsight(response.data.insight);
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

      {tabularData && tabularData.length > 0 && (
        <div className="card">
            <DataChart data={tabularData} />
            <DataTable data={tabularData} />
        </div>
      )}

      {insight && (
        <div className="card">
          <h2>Insight:</h2>
          <pre>{insight}</pre>
        </div>
      )}
    </div>
  );
}

export default App;