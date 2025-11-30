import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import { set, get } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.75rem;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  @media (max-width: 768px) {
    max-width: 95%;
    padding: 1.25rem;
  }
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.95rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
`;

const Input = styled.input`
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
  transition: all 0.2s;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  background: #f9fafb;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Button = styled.button`
  padding: 0.875rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #2563eb;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ResetButton = styled.button`
  padding: 0.875rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  transition: background 0.2s;
  &:hover {
    background: #4b5563;
  }
`;

const Message = styled.p`
  color: ${props => (props.error ? '#ef4444' : '#10b981')};
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  margin: 0.75rem 0 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: ${props => (props.error ? '#fee2e2' : '#f0fdf4')};
  border: 1px solid ${props => (props.error ? '#fecaca' : '#bbf7d0')};
`;

const PreviewGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const PreviewWrapper = styled.div`
  position: relative;
  width: 90px;
  height: 90px;
`;

const Preview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

/* -------------------------------------------------------------------------- */
/*                                 Main Component                             */
/* -------------------------------------------------------------------------- */
const CatchLog = () => {
  const { t } = useTranslation();
  const { user, isOnline, api } = useContext(AuthContext);
  const [location, setLocation] = useState({ lat: '', lng: '' });
  /** @type {File[]} */
  const [images, setImages] = useState([]);
  /** @type {string[]} */
  const [imagePreviews, setImagePreviews] = useState([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    species: '',
    dryingMethod: '',
    weight: '',
    harvestDate: new Date().toISOString().split('T')[0],
    shelfLife: '',
    price: '',
  });

  // Auto-generated Catch ID
  const catchId = useMemo(() => `CATCH-${uuidv4().split('-')[0].toUpperCase()}`, []);

  /* --------------------------- Geolocation --------------------------- */
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          });
        },
        () => {
          setMessage(t('catchLog.location_failed', 'Location not detected.'));
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    }
  }, [t]);

  /* --------------------------- Offline Sync --------------------------- */
  const syncOfflineCatches = useCallback(async () => {
    if (!isOnline) return;
    try {
      const offlineCatches = (await get('pendingCatches')) || [];
      if (offlineCatches.length === 0) return;

      let synced = 0;
      const failed = [];

      for (const entry of offlineCatches) {
        try {
          const formData = new FormData();
          Object.entries(entry.data).forEach(([key, value]) => {
            if (value !== null) formData.append(key, value);
          });
          entry.images.forEach((img, i) => formData.append(`image_${i}`, img));

          await api.post('/catches', formData);
          synced++;
        } catch (err) {
          failed.push(entry);
        }
      }

      await set('pendingCatches', failed);
      if (synced > 0) {
        setMessage(t('catchLog.sync_success', `Synced ${synced} catch(es)!`));
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  }, [isOnline, api, t]);

  useEffect(() => {
    if (isOnline) syncOfflineCatches();
    const interval = setInterval(syncOfflineCatches, 30000);
    window.addEventListener('online', syncOfflineCatches);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', syncOfflineCatches);
    };
  }, [syncOfflineCatches, isOnline]);

  /* --------------------------- Image Upload --------------------------- */
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  /* --------------------------- Form Submit --------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'fisherman') {
      setMessage(t('catchLog.access_denied', 'Access denied.'));
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const payload = {
      catch_id: catchId,
      user_id: user.id,
      species: formData.species,
      weight: formData.weight,
      harvest_date: formData.harvestDate,
      drying_method: formData.dryingMethod,
      shelf_life: formData.shelfLife,
      price: formData.price,
      lat: location.lat || null,
      lng: location.lng || null,
    };

    try {
      if (isOnline) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null) formData.append(key, value);
        });
        images.forEach((img, i) => formData.append(`image_${i}`, img));

        await api.post('/catches', formData);

        // Auto-create batch if multiple pending catches
        const pending = (await get('pendingCatches')) || [];
        if (pending.length > 0) {
          const batchId = `BATCH-${Date.now()}`;
          const batchPayload = {
            batch_id: batchId,
            catch_ids: [catchId, ...pending.map((c) => c.data.catch_id)],
            user_id: user.id,
            batch_date: new Date().toISOString().split('T')[0],
          };
          await api.post('/batches', batchPayload);
          await set('pendingCatches', []); // Clear after batch
          setMessage(t('catchLog.batch_created', `Batch ${batchId} created!`));
        } else {
          setMessage(t('catchLog.success', 'Catch logged!'));
        }

        resetForm();
      } else {
        const offlineEntry = {
          type: 'catch_log',
          data: payload,
          images,
          timestamp: new Date().toISOString(),
        };
        await set('pendingCatches', [
          ...(await get('pendingCatches') || []),
          offlineEntry,
        ]);
        setMessage(t('catchLog.offline_saved', 'Saved offline.'));
        resetForm();
      }
    } catch (err) {
      setMessage(t('catchLog.error', `Failed: ${err?.message || err}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      species: '',
      dryingMethod: '',
      weight: '',
      harvestDate: new Date().toISOString().split('T')[0],
      shelfLife: '',
      price: '',
    });
    setImages([]);
    setImagePreviews([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* --------------------------- Access Guard --------------------------- */
  if (!user || user.role !== 'fisherman') {
    return (
      <Message error>
        {t('catchLog.access_denied', 'Access denied.')}
      </Message>
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Render                                   */
  /* -------------------------------------------------------------------------- */
  return (
    <Form onSubmit={handleSubmit}>
      <h2 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.9rem', fontWeight: 700 }}>
        {t('catchLog.title', 'Log New Catch')}
      </h2>

      {/* Auto-generated Catch ID */}
      <div style={{
        padding: '0.75rem 1rem',
        background: '#f0f9ff',
        borderRadius: 10,
        fontFamily: 'monospace',
        fontSize: '0.95rem',
        color: '#1e40af'
      }}>
        <strong>{t('catchLog.catch_id', 'Catch ID (Auto):')}</strong> <code>{catchId}</code>
      </div>

      <div>
        <Label>{t('catchLog.species', 'Species')} *</Label>
        <Select name="species" value={formData.species} onChange={handleChange} required>
          <option value="">{t('catchLog.placeholders.species', 'Select species')}</option>
          <option value="Tilapia">Tilapia</option>
          <option value="Catfish">Catfish</option>
          <option value="Nile Perch">Nile Perch</option>
          <option value="Mackerel">Mackerel</option>
          <option value="Sardine">Sardine</option>
        </Select>
      </div>

      <div>
        <Label>{t('catchLog.dryingMethod', 'Drying Method')} *</Label>
        <Select name="dryingMethod" value={formData.dryingMethod} onChange={handleChange} required>
          <option value="">{t('catchLog.placeholders.dryingMethod', 'Select method')}</option>
          <option value="Sun-dried">Sun-dried</option>
          <option value="Smoked">Smoked</option>
          <option value="Solar-dried">Solar-dried</option>
          <option value="Oven-dried">Oven-dried</option>
        </Select>
      </div>

      <div>
        <Label>{t('catchLog.weight', 'Weight per Fish (kg)')} *</Label>
        <Input
          type="number"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          placeholder={t('catchLog.placeholders.weight', 'e.g. 1.5')}
          step="0.1"
          min="0.1"
          required
        />
      </div>

      <div>
        <Label>{t('catchLog.harvestDate', 'Harvest Date')} *</Label>
        <Input
          type="date"
          name="harvestDate"
          value={formData.harvestDate}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label>{t('catchLog.shelfLife', 'Shelf Life (days)')} *</Label>
        <Input
          type="number"
          name="shelfLife"
          value={formData.shelfLife}
          onChange={handleChange}
          placeholder={t('catchLog.placeholders.shelfLife', 'e.g. 30')}
          min="1"
          required
        />
      </div>

      <div>
        <Label>{t('catchLog.price', 'Price per kg (USD)')} *</Label>
        <Input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder={t('catchLog.placeholders.price', 'e.g. 5.50')}
          step="0.01"
          min="0"
          required
        />
      </div>

      {location.lat && (
        <div style={{ fontSize: '0.875rem', color: '#059669', background: '#f0fdf4', padding: '0.5rem 1rem', borderRadius: 8 }}>
          {t('catchLog.location.lat', 'Lat')}: <strong>{location.lat}</strong> | 
          {t('catchLog.location.lng', ' Lng')}: <strong>{location.lng}</strong>
        </div>
      )}

      <div>
        <Label>{t('catchLog.images', 'Photos')} ({t('optional', 'Optional')})</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleImageUpload}
        />
        {imagePreviews.length > 0 && (
          <PreviewGrid>
            {imagePreviews.map((src, i) => (
              <PreviewWrapper key={i}>
                <Preview src={src} alt={`preview-${i}`} />
                <RemoveBtn type="button" onClick={() => removeImage(i)}>
                  ×
                </RemoveBtn>
              </PreviewWrapper>
            ))}
          </PreviewGrid>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <Button type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
          {isSubmitting 
            ? t('catchLog.submitting', 'Submitting...') 
            : isOnline 
              ? t('catchLog.submit', 'Submit Catch')
              : t('catchLog.save_offline', 'Save Offline')
          }
        </Button>
        <ResetButton type="button" onClick={resetForm}>
          {t('catchLog.reset', 'Reset')}
        </ResetButton>
      </div>

      {message && (
        <Message error={message.includes('Failed') || message.includes('denied')}>
          {message}
        </Message>
      )}
    </Form>
  );
};

export default CatchLog;