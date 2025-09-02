// src/services/blockchain.js
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api, getCatches, createCatch, uploadToIPFS } from '../services/api';

// Utility to get cookie by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const uploadImageToIPFS = async (file) => {
  try {
    // Get XSRF-TOKEN from cookies
    const xsrfToken = getCookie('XSRF-TOKEN');
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('http://localhost:8000/api/upload-ipfs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-XSRF-TOKEN': xsrfToken ? decodeURIComponent(xsrfToken) : '',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      withCredentials: true, // Send cookies
    });

    return response.data.url; // Assuming backend returns { url: 'https://ipfs.io/ipfs/hash' }
  } catch (error) {
    console.error('[uploadImageToIPFS] Error:', error.response?.data || error.message);
    throw new Error('CSRF token mismatch or server error');
  }
};

export const createBatchOnBlockchain = async (data) => {
  // Implement blockchain batch creation (e.g., Ethereum smart contract)
  return `BATCH_${Date.now()}`;
};