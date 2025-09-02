// services/offline.js
import Dexie from 'dexie';

const db = new Dexie('FisheriesDB');
db.version(1).stores({
  catchEntries: '++id, batchId, species, dryingMethod, batchSize, weight, harvestDate, location, shelfLife, price, imageUrls, qualityScore',
  inventory: 'batchId, species, quantity, freshness',
});

export const saveCatchEntryOffline = async (entry) => {
  await db.catchEntries.add(entry);
};

export const syncOfflineData = async () => {
  const entries = await db.catchEntries.toArray();
  for (const entry of entries) {
    try {
      await api.createCatchEntry(entry);
      await db.catchEntries.delete(entry.id);
    } catch (error) {
      console.error('Sync failed for entry:', entry, error);
    }
  }
};