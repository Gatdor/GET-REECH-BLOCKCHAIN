// src/services/offline.js
import Dexie from 'dexie';

const db = new Dexie('FMSOfflineDB');
db.version(1).stores({
  catches: '++id,species,weight,location,created_at,synced',
  listings: '++id,species,price,location,created_at,synced',
});

export const saveCatchOffline = async (catchData) => {
  await db.catches.add({ ...catchData, synced: false });
};

export const saveListingOffline = async (listingData) => {
  await db.listings.add({ ...listingData, synced: false });
};

export const getOfflineCatches = async () => {
  return await db.catches.toArray();
};

export const getOfflineListings = async () => {
  return await db.listings.toArray();
};

export const syncData = async (api) => {
  const offlineCatches = await db.catches.where({ synced: false }).toArray();
  for (const catchData of offlineCatches) {
    try {
      await api.createCatch(catchData);
      await db.catches.update(catchData.id, { synced: true });
    } catch (error) {
      console.error('Sync failed for catch:', error);
    }
  }

  const offlineListings = await db.listings.where({ synced: false }).toArray();
  for (const listing of offlineListings) {
    try {
      await api.createListing(listing);
      await db.listings.update(listing.id, { synced: true });
    } catch (error) {
      console.error('Sync failed for listing:', error);
    }
  }
};

export default db;