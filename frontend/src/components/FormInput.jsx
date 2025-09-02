// src/components/FormInput.jsx
import React from 'react';

const FormInput = ({ label, name, value, onChange, required, type = 'text', error, placeholder }) => {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        required={required}
        aria-required={required}
        placeholder={placeholder}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default FormInput;