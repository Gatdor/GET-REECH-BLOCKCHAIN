// src/components/FeedbackForm.jsx
import React, { useState } from 'react';

const FeedbackForm = () => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Feedback:', feedback); // Mock API call
  };

  return (
    <div className="container p-4">
      <h2 className="text-white">Feedback (Maoni)</h2>
      <form onSubmit={handleSubmit} className="p-4 bg-white bg-opacity-10 rounded">
        <div className="mb-3">
          <label className="form-label text-white">Your Feedback (Maoni Yako)</label>
          <textarea
            className="form-control"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows="4"
            required
            aria-required="true"
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Submit (Tuma)</button>
      </form>
    </div>
  );
};

export default FeedbackForm;