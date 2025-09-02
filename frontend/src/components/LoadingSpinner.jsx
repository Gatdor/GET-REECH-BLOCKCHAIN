// src/components/LoadingSpinner.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../App.css';

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <FontAwesomeIcon icon={faSpinner} spin size="2x" />
    <p>Loading FMS...</p>
  </div>
);

export default LoadingSpinner;