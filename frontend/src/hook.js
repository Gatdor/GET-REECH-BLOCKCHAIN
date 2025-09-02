import { useState, useEffect } from 'react';
import api from '../src/services/api';

export const useBlockchainBatch = (batchData) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!batchData) {
      setError('Batch data is unavailable');
      return;
    }

    const createBatch = async () => {
      try {
        const response = await api.post('/create-batch', batchData);
        setResult(response.data);
      } catch (err) {
        console.error('[useBlockchainBatch] Blockchain batch creation error:', err);
        setError(err.message);
      }
    };
    createBatch();
  }, [batchData]);

  return { result, error };
};
