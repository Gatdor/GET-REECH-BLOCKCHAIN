import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import api from '../../services/Api';
import { uploadImageToIPFS, createBatchOnBlockchain } from '../../services/blockchain';
import { analyzeImageQuality } from '../../services/imageAnalysis';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 2rem auto;
`;

const CatchEntry = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    location: { lat: '', lng: '' },
    shelfLife: '',
    price: '',
    images: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Upload images to IPFS
      const imageUrls = await Promise.all(formData.images.map(uploadImageToIPFS));
      
      // Analyze image quality
      const qualityScore = await analyzeImageQuality(imageUrls[0]);
      
      // Create batch on blockchain
      const batchId = await createBatchOnBlockchain({
        ...formData,
        imageUrls,
        qualityScore,
      });

      // Save to backend
      await api.createCatchEntry({
        ...formData,
        batchId,
        imageUrls,
        qualityScore,
      });

      alert(t('catchEntry.success'));
    } catch (error) {
      console.error('Error creating catch entry:', error);
      alert(t('catchEntry.error'));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, images: files });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>{t('catchEntry.title')}</h2>
      <select
        value={formData.species}
        onChange={(e) => setFormData({ ...formData, species: e.target.value })}
        required
      >
        <option value="">{t('catchEntry.species')}</option>
        <option value="tilapia">{t('catchEntry.species.tilapia')}</option>
        <option value="sardine">{t('catchEntry.species.sardine')}</option>
      </select>
      <select
        value={formData.dryingMethod}
        onChange={(e) => setFormData({ ...formData, dryingMethod: e.target.value })}
        required
      >
        <option value="">{t('catchEntry.dryingMethod')}</option>
        <option value="sun-dried">{t('catchEntry.dryingMethod.sunDried')}</option>
        <option value="smoked">{t('catchEntry.dryingMethod.smoked')}</option>
        <option value="solar-dried">{t('catchEntry.dryingMethod.solarDried')}</option>
      </select>
      <input
        type="number"
        placeholder={t('catchEntry.batchSize')}
        value={formData.batchSize}
        onChange={(e) => setFormData({ ...formData, batchSize: e.target.value })}
        required
      />
      <input
        type="number"
        placeholder={t('catchEntry.weight')}
        value={formData.weight}
        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
        required
      />
      <input
        type="date"
        placeholder={t('catchEntry.harvestDate')}
        value={formData.harvestDate}
        onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
        required
      />
      <input
        type="number"
        placeholder={t('catchEntry.location.lat')}
        value={formData.location.lat}
        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, lat: e.target.value } })}
        required
      />
      <input
        type="number"
        placeholder={t('catchEntry.location.lng')}
        value={formData.location.lng}
        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, lng: e.target.value } })}
        required
      />
      <input
        type="number"
        placeholder={t('catchEntry.shelfLife')}
        value={formData.shelfLife}
        onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
        required
      />
      <input
        type="number"
        placeholder={t('catchEntry.price')}
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        required
      />
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageUpload}
      />
      <button type="submit">{t('catchEntry.submit')}</button>
    </Form>
  );
};

export default CatchEntry;