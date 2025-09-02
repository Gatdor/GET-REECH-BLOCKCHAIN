// services/logistics.js
export const matchLogistics = async (batchId, cargoSize, freshness, location) => {
  const response = await api.post('/logistics/match', {
    batchId,
    cargoSize,
    freshness,
    location,
  });
  return response.data;
};