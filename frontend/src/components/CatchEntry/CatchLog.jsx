// src/pages/CatchLog.jsx
import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { AuthContext } from '../../context/AuthContext';
import { uploadImageToIPFS, createBatchOnBlockchain } from '../../services/blockchain';
import { analyzeImageQuality } from '../../services/imageAnalysis';
import { set, get } from 'idb-keyval';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 2rem auto;
`;

const Preview = styled.img`
  max-width: 100px;
  max-height: 100px;
  object-fit: cover;
  border: 1px solid #ccc;
`;

const Input = styled.input`
  padding: 0.6rem;
`;

const Select = styled.select`
  padding: 0.6rem;
`;

const CatchLog = () => {
  const { user, supabase, isOnline } = useContext(AuthContext);
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [formData, setFormData] = useState({
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    shelfLife: '',
    price: '',
    images: [],
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error('GPS Error:', err);
        alert('Failed to detect location. Please allow GPS access.');
      }
    );
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, images: files }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const batchId = `BATCH_${Date.now()}`;

    try {
      const imageUrls = await Promise.all(formData.images.map(uploadImageToIPFS));
      const qualityScore = await analyzeImageQuality(imageUrls[0]);

      const data = {
        batch_id: batchId,
        user_id: user?.id || 'anonymous',
        species: formData.species,
        drying_method: formData.dryingMethod,
        batch_size: formData.batchSize,
        weight: formData.weight,
        harvest_date: formData.harvestDate,
        location: { type: 'Point', coordinates: [location.lng, location.lat] },
        shelf_life: formData.shelfLife,
        price: formData.price,
        image_urls: imageUrls,
        quality_score: qualityScore,
      };

      if (isOnline) {
        await supabase.from('catch_logs').insert(data);
        await createBatchOnBlockchain(data);
      } else {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'catch_log', data },
        ]);
      }

      alert('✅ Catch logged successfully');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to log catch');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>Catch Log</h2>

      <Select name="species" onChange={handleChange} value={formData.species} required>
        <option value="">Select species</option>
        <option value="Tilapia">Tilapia</option>
        <option value="Catfish">Catfish</option>
        <option value="Nile Perch">Nile Perch</option>
      </Select>

      <Select name="dryingMethod" onChange={handleChange} value={formData.dryingMethod} required>
        <option value="">Select drying method</option>
        <option value="Sun-dried">Sun-dried</option>
        <option value="Smoked">Smoked</option>
        <option value="Solar-dried">Solar-dried</option>
      </Select>

      <Input type="number" name="batchSize" onChange={handleChange} placeholder="Batch Size (kg)" required />
      <Input type="number" name="weight" onChange={handleChange} placeholder="Weight per fish (g)" required />
      <Input type="date" name="harvestDate" onChange={handleChange} required />
      <Input type="number" name="shelfLife" onChange={handleChange} placeholder="Shelf Life (days)" required />
      <Input type="number" name="price" onChange={handleChange} placeholder="Price (USD)" required />

      <Input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        capture="environment"
        required
      />
      <div>
        {formData.images.map((img, i) => (
          <Preview key={i} src={URL.createObjectURL(img)} alt={`preview-${i}`} />
        ))}
      </div>

      <button type="submit">Submit Catch</button>
    </Form>
  );
};

export default CatchLog;
