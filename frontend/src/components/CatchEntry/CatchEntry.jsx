import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { AuthContext } from '../../context/AuthContext';
import { set, get } from 'idb-keyval';
import axios from 'axios';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
  @media (max-width: 768px) {
    max-width: 90%;
  }
`;

const Preview = styled.img`
  max-width: 100px;
  max-height: 100px;
  object-fit: cover;
  border: 1px solid #ccc;
  margin: 0.5rem;
`;

const Input = styled.input`
  padding: 0.6rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 0.6rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 0.8rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  &:hover {
    background-color: #0056b3;
  }
`;

const Message = styled.p`
  color: ${props => (props.error ? 'red' : 'green')};
  font-size: 0.9rem;
`;

const CatchLog = () => {
  const { user, supabase, isOnline } = useContext(AuthContext);
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [formData, setFormData] = useState({
    catchID: `CATCH_${Date.now()}`,
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    shelfLife: '',
    price: '',
    images: [],
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Get geolocation
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error('GPS Error:', err);
        setMessage('Failed to detect location. Please allow GPS access.');
        setError(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Sync offline catches
    if (isOnline) {
      syncOfflineCatches();
    }
    window.addEventListener('online', syncOfflineCatches);
    return () => window.removeEventListener('online', syncOfflineCatches);
  }, [isOnline]);

  const syncOfflineCatches = async () => {
    try {
      const offlineActions = (await get('offlineActions')) || [];
      for (const action of offlineActions) {
        if (action.type === 'catch_log') {
          const { catchID, fisherID, species, weight, harvestDate } = action.data;
          await axios.post('http://localhost:3001/api/log-catch', {
            catchID,
            fisherID,
            species,
            weightKg: weight,
            date: harvestDate,
          });
          await supabase.from('catch_logs').insert(action.data);
          // Remove synced action
          const updatedActions = offlineActions.filter(a => a.data.catchID !== catchID);
          await set('offlineActions', updatedActions);
        }
      }
      if (offlineActions.length > 0) {
        setMessage('Synced offline catches successfully!');
        setError(false);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setMessage('Failed to sync offline catches.');
      setError(true);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    try {
      // Fallback to local storage (base64) to avoid IPFS costs
      const imageUrls = await Promise.all(
        files.map(async (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // Base64 string
            reader.readAsDataURL(file);
          });
        })
      );
      setFormData((prev) => ({ ...prev, images: files, imageUrls }));
    } catch (err) {
      console.error('Image upload error:', err);
      setMessage('Failed to process images.');
      setError(true);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'fisher') {
      setMessage('Access denied: Only fishers can log catches.');
      setError(true);
      return;
    }

    const data = {
      catch_id: formData.catchID,
      user_id: user?.id || 'anonymous',
      species: formData.species,
      drying_method: formData.dryingMethod,
      batch_size: parseFloat(formData.batchSize),
      weight: parseFloat(formData.weight),
      harvest_date: formData.harvestDate,
      location: { type: 'Point', coordinates: [location.lng, location.lat] },
      shelf_life: parseInt(formData.shelfLife),
      price: parseFloat(formData.price),
      image_urls: formData.imageUrls || [],
      quality_score: 0, // Placeholder, as image analysis is removed
    };

    try {
      if (isOnline) {
        // Log to blockchain
        await axios.post('http://localhost:3001/api/log-catch', {
          catchID: formData.catchID,
          fisherID: user.id,
          species: formData.species,
          weightKg: formData.weight,
          date: formData.harvestDate,
        });
        // Log to Supabase
        await supabase.from('catch_logs').insert(data);
        setMessage('✅ Catch logged successfully');
        setError(false);
      } else {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'catch_log', data },
        ]);
        setMessage('Catch saved locally, will sync when online.');
        setError(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setMessage(`❌ Failed to log catch: ${err.response?.data?.error || err.message}`);
      setError(true);
    }
  };

  if (user?.role !== 'fisher') {
    return <Message error>Access denied: Only fishers can access this page.</Message>;
  }

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
      <Input
        type="text"
        name="catchID"
        value={formData.catchID}
        onChange={handleChange}
        placeholder="Catch ID (e.g., CATCH_123)"
        required
      />
      <Input
        type="number"
        name="batchSize"
        onChange={handleChange}
        placeholder="Batch Size (kg)"
        step="0.1"
        required
      />
      <Input
        type="number"
        name="weight"
        onChange={handleChange}
        placeholder="Weight per fish (kg)"
        step="0.1"
        required
      />
      <Input
        type="date"
        name="harvestDate"
        onChange={handleChange}
        required
      />
      <Input
        type="number"
        name="shelfLife"
        onChange={handleChange}
        placeholder="Shelf Life (days)"
        required
      />
      <Input
        type="number"
        name="price"
        onChange={handleChange}
        placeholder="Price (USD)"
        step="0.01"
        required
      />
      <Input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        capture="environment"
      />
      <div>
        {formData.images.map((img, i) => (
          <Preview key={i} src={URL.createObjectURL(img)} alt={`preview-${i}`} />
        ))}
      </div>
      <Button type="submit">Submit Catch</Button>
      {message && <Message error={error}>{message}</Message>}
    </Form>
  );
};

export default CatchLog;