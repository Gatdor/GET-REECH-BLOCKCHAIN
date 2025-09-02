import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import api from '../../services/Api';

const ReportSection = styled.div`
  margin-top: 2rem;
`;

const CooperativeDashboard = () => {
  const { t } = useTranslation();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['cooperativeReports'],
    queryFn: api.getCooperativeReports,
  });

  if (isLoading) return <div>{t('cooperative.loading')}</div>;

  return (
    <div>
      <h2>{t('cooperative.title')}</h2>
      <ReportSection>
        <h3>{t('cooperative.environmentalImpact')}</h3>
        <p>{reports?.environmentalImpact}</p>
      </ReportSection>
      <ReportSection>
        <h3>{t('cooperative.participation')}</h3>
        <p>{reports?.genderParticipation}</p>
      </ReportSection>
      <ReportSection>
        <h3>{t('cooperative.tradeVolume')}</h3>
        <p>{reports?.tradeVolume}</p>
      </ReportSection>
    </div>
  );
};

export default CooperativeDashboard;
