// services/pricing.js
export const getDynamicPrice = async (batchId, qualityScore, marketTrends) => {
  const response = await api.post('/pricing/dynamic', {
    batchId,
    qualityScore,
    marketTrends,
  });
  return response.data.price;
};