// src/services/blockchain.js
export async function uploadImageToIPFS(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('http://localhost:3000/api/upload-ipfs', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (response.ok) return data.url;
    throw new Error(data.error || 'IPFS upload failed');
  } catch (error) {
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

export async function createBatchOnBlockchain(data) {
  try {
    const response = await fetch('http://localhost:3000/api/create-catch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: data.batch_id,
        fishermanID: data.user_id,
        species: data.species,
        weight: data.weight,
        location: data.location,
        timestamp: data.harvest_date,
        dryingMethod: data.drying_method,
        batchSize: data.batch_size,
        shelfLife: data.shelf_life,
        price: data.price,
        imageUrls: data.image_urls,
      }),
    });
    const result = await response.json();
    if (response.ok) return result.transactionHash;
    throw new Error(result.error || 'Blockchain transaction failed');
  } catch (error) {
    throw new Error(`Blockchain transaction failed: ${error.message}`);
  }
}