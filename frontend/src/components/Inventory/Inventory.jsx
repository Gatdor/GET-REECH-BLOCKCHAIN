import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import QRCode from 'react-qr-code';
import { supabase } from '../../services/supabase';

const InventoryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 2rem;
`;

const Inventory = () => {
  const { t } = useTranslation();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory').select('*');
      return data;
    },
  });

  if (isLoading) return <div>{t('inventory.loading')}</div>;

  return (
    <div>
      <h2>{t('inventory.title')}</h2>
      <InventoryTable>
        <thead>
          <tr>
            <th>{t('inventory.batchId')}</th>
            <th>{t('inventory.species')}</th>
            <th>{t('inventory.quantity')}</th>
            <th>{t('inventory.freshness')}</th>
            <th>{t('inventory.qrCode')}</th>
          </tr>
        </thead>
        <tbody>
          {inventory?.map((item) => (
            <tr key={item.batch_id}>
              <td>{item.batch_id}</td>
              <td>{item.species}</td>
              <td>{item.quantity}</td>
              <td>{item.freshness}</td>
              <td>
                <QRCode value={`https://fms.example.com/trace/${item.batch_id}`} size={64} />
              </td>
            </tr>
          ))}
        </tbody>
      </InventoryTable>
    </div>
  );
};

export default Inventory;