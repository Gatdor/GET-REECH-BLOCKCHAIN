import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSlidersH, faSave } from '@fortawesome/free-solid-svg-icons';
import FormInput from '../components/FormInput';
import '../App.css';

const Settings = () => {
  const [formData, setFormData] = useState({
    systemName: 'Fisheries Management System',
    language: 'English',
    timezone: 'Africa/Nairobi',
  });

  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.systemName.trim()) newErrors.systemName = 'System Name is required.';
    if (!formData.language.trim()) newErrors.language = 'Language is required.';
    if (!formData.timezone.trim()) newErrors.timezone = 'Timezone is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="container">
      <div className="card">
        <h2 className="card-title">
          <FontAwesomeIcon icon={faSlidersH} className="me-2" />
          Settings (Mipangilio)
        </h2>
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '500px', width: '100%' }}>
          <FormInput
            label="System Name (Jina la Mfumo)"
            name="systemName"
            value={formData.systemName}
            onChange={handleChange}
            required
            error={errors.systemName}
            placeholder="e.g., Fisheries Management System"
          />
          <FormInput
            label="Language (Lugha)"
            name="language"
            value={formData.language}
            onChange={handleChange}
            required
            error={errors.language}
            placeholder="e.g., English, Kiswahili"
          />
          <FormInput
            label="Timezone (Saa za Mahali)"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            required
            error={errors.timezone}
            placeholder="e.g., Africa/Nairobi"
          />

          <button type="submit" className="btn btn-primary mt-3">
            <FontAwesomeIcon icon={faSave} className="me-2" />
            Save Settings (Hifadhi Mipangilio)
          </button>

          {isSaved && <p className="text-success mt-2">Settings saved successfully!</p>}
        </form>
      </div>
    </div>
  );
};

export default Settings;
