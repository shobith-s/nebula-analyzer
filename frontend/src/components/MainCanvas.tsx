import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import DataTable from './DataTable';
import DataChart from './DataChart';
import FeatureImportanceChart from './FeatureImportanceChart';

interface ImportanceData {
  name: string;
  importance: number;
}

function MainCanvas() {
  const [query, setQuery] = useState<string>('');
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tabularData, setTabularData] = useState<number[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [featureImportances, setFeatureImportances] = useState<ImportanceData[] | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            alert("Error: No valid numerical data rows were found in the CSV. Please check the file for text or empty rows.");
            setTabularData(null);
            setFileName('');
            return;
          }
          if (numericData.length > 0 && numericData[0].length !== 20) {
            alert(`Error: The model expects 20 columns. Your file has ${numericData[0].length}. Visualizations will be shown, but analysis may fail.`);
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
    if (tabularData[0].length !== 20) {
      alert(`Analysis failed: The model requires exactly 20 columns of data, but your file has ${tabularData[0].length}.`);
      return;
    }
    if (!query.trim()) {
      alert('Please enter a query.');
      return;
    }
    
    setIsLoading(true);
    setInsight('');
    setFeatureImportances(null);

    const requestData = {
      tabular_data: tabularData,
      query: query,
    };

    try {
      const apiUrl = 'http://127.0.0.1:8000/analyze';
      const response = await axios.post(apiUrl, requestData);
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

  // Define a simple animation for the cards to fade in
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <main className="main-canvas">
      <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
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
      </motion.div>

      {featureImportances && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <FeatureImportanceChart data={featureImportances} />
        </motion.div>
      )}

      {insight && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
          <h2>Insight:</h2>
          <pre>{insight}</pre>
        </motion.div>
      )}

      {tabularData && tabularData.length > 0 && (
        <motion.div className="card" variants={cardVariants} initial="hidden" animate="visible">
            <DataChart data={tabularData} />
            <DataTable data={tabularData} />
        </motion.div>
      )}
    </main>
  );
}

export default MainCanvas;