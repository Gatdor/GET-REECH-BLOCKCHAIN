import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faSignOutAlt, faFilter, faEye, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

const DashboardWrapper = styled.div`
  padding: 1rem;
  background: ${props => props.theme.background || '#F3F4F6'};
  min-height: 100vh;
`;

const DashboardCard = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${props => props.theme.cardBackground || '#FFFFFF'};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  color: ${props => props.theme.text || '#111827'};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${props => props.theme.textSecondary || '#6B7280'};
`;

const LogoutButton = styled(motion.button)`
  background: #EF4444;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const Tabs = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => (props.active ? props.theme.primary || '#3B82F6' : 'transparent')};
  color: ${props => (props.active ? '#FFFFFF' : props.theme.textSecondary || '#6B7280')};
  border-radius: 4px;
  cursor: pointer;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.text || '#111827'};
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border || '#D1D5DB'};
  border-radius: 4px;
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border || '#D1D5DB'};
  border-radius: 4px;
  font-size: 1rem;
`;

const Button = styled(motion.button)`
  background: ${props => props.theme.primary || '#3B82F6'};
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const ResetButton = styled(motion.button)`
  background: ${props => props.theme.secondary || '#6B7280'};
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const ErrorMessage = styled(motion.div)`
  color: #EF4444;
  font-size: 0.875rem;
`;

const SuccessMessage = styled(motion.div)`
  color: #10B981;
  font-size: 0.875rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 0.75rem;
  text-align: left;
  background: ${props => props.theme.tableHeader || '#F3F4F6'};
  color: ${props => props.theme.text || '#111827'};
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border || '#D1D5DB'};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

const PaginationButton = styled(motion.button)`
  background: ${props => props.theme.primary || '#3B82F6'};
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props => (props.disabled ? 0.5 : 1)};
`;

const pageVariants = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -50 },
};

const FishermanDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline, logout, createCatch, getCatches, createBatch } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('view');
  const [catchFormData, setCatchFormData] = useState({
    catch_id: `CATCH_${Date.now()}`,
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    shelfLife: '',
    price: '',
    lat: '',
    lng: '',
    images: [],
  });
  const [batchFormData, setBatchFormData] = useState({
    batch_id: `BATCH_${Date.now()}`,
    catch_ids: [],
    batch_date: new Date().toISOString().split('T')[0],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [geoError, setGeoError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCatchFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          }));
        },
        (err) => {
          setGeoError(t('DashboardErrorsGeolocation', 'Unable to retrieve location. Enter manually.'));
          Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'geolocation' } });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoError(t('DashboardErrorsGeolocationUnsupported', 'Geolocation not supported. Enter manually.'));
    }

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
          await createCatch(action.data);
          const updatedActions = offlineActions.filter((a) => a.data.catch_id !== action.data.catch_id);
          await set('offlineActions', updatedActions);
        } else if (action.type === 'batch_create') {
          await createBatch(action.data);
          const updatedActions = offlineActions.filter((a) => a.data.batch_id !== action.data.batch_id);
          await set('offlineActions', updatedActions);
        }
      }
      if (offlineActions.length > 0) {
        setSuccess(t('DashboardSuccessOfflineSynced', 'Synced offline actions successfully!'));
        queryClient.invalidateQueries(['catches', user?.id]);
      }
    } catch (err) {
      console.error('[FishermanDashboard] Sync error:', err);
      Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'syncOfflineCatches' } });
      setLocalError(t('DashboardErrorsSync', 'Failed to sync offline actions'));
    }
  };

  const { data: catches, error: catchesError, isLoading: catchesLoading } = useQuery({
    queryKey: ['catches', user?.id, filterStatus],
    queryFn: async () => {
      if (!isOnline) {
        const offlineActions = (await get('offlineActions')) || [];
        return offlineActions
          .filter(action => action.type === 'catch_log')
          .map(action => ({
            ...action.data,
            status: 'pending',
            blockchain_transaction_hash: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
      }
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      return await getCatches({ status: filterStatus || undefined });
    },
    enabled: !!user && user.role === 'fisherman',
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('[FishermanDashboard] Fetch catches error:', err);
      Sentry.captureException(err, { extra: { component: 'FishermanDashboard', query: 'catches' } });
      setLocalError(err.message || t('DashboardErrorsNetwork', 'Network error.'));
    },
  });

  const columns = useMemo(
    () => [
      { accessorKey: 'catch_id', header: t('DashboardCatchId', 'Catch ID') },
      { accessorKey: 'species', header: t('DashboardSpecies', 'Species') },
      { accessorKey: 'weight', header: t('DashboardWeight', 'Weight (kg)') },
      { accessorKey: 'harvest_date', header: t('DashboardHarvestDate', 'Harvest Date') },
      { accessorKey: 'status', header: t('DashboardStatus', 'Status') },
      {
        id: 'actions',
        header: t('DashboardActions', 'Actions'),
        cell: ({ row }) => (
          <Button
            onClick={() => navigate(`/catch-details/${row.original.catch_id}`)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FontAwesomeIcon icon={faEye} /> {t('DashboardView', 'View')}
          </Button>
        ),
      },
    ],
    [t, navigate]
  );

  const table = useReactTable({
    data: catches || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const validateCatchForm = () => {
    if (!catchFormData.catch_id.startsWith('CATCH_')) return t('DashboardErrorsInvalidCatchId', 'Catch ID must start with CATCH_');
    if (!catchFormData.species) return t('DashboardErrorsSpeciesRequired', 'Species is required');
    if (!catchFormData.dryingMethod) return t('DashboardErrorsDryingMethodRequired', 'Drying method is required');
    if (!catchFormData.batchSize || isNaN(catchFormData.batchSize) || catchFormData.batchSize < 0.01) return t('DashboardErrorsInvalidBatchSize', 'Batch size must be at least 0.01');
    if (!catchFormData.weight || isNaN(catchFormData.weight) || catchFormData.weight < 0.01) return t('DashboardErrorsInvalidWeight', 'Weight must be at least 0.01');
    if (!catchFormData.harvestDate || new Date(catchFormData.harvestDate) > new Date()) return t('DashboardErrorsInvalidHarvestDate', 'Harvest date must be today or earlier');
    if (!catchFormData.lat || isNaN(catchFormData.lat) || catchFormData.lat < -90 || catchFormData.lat > 90) return t('DashboardErrorsInvalidLat', 'Latitude must be between -90 and 90');
    if (!catchFormData.lng || isNaN(catchFormData.lng) || catchFormData.lng < -180 || catchFormData.lng > 180) return t('DashboardErrorsInvalidLng', 'Longitude must be between -180 and 180');
    if (!catchFormData.shelfLife || isNaN(catchFormData.shelfLife) || catchFormData.shelfLife < 1) return t('DashboardErrorsInvalidShelfLife', 'Shelf life must be at least 1 day');
    if (!catchFormData.price || isNaN(catchFormData.price) || catchFormData.price < 0.01) return t('DashboardErrorsInvalidPrice', 'Price must be at least 0.01');
    if (catchFormData.images.length > 5) return t('DashboardErrorsTooManyImages', 'Maximum 5 images allowed');
    return '';
  };

  const validateBatchForm = () => {
    if (!batchFormData.batch_id.startsWith('BATCH_')) return t('DashboardErrorsInvalidBatchId', 'Batch ID must start with BATCH_');
    if (!batchFormData.catch_ids.length) return t('DashboardErrorsNoCatchesSelected', 'At least one catch must be selected');
    if (!batchFormData.batch_date || new Date(batchFormData.batch_date) > new Date()) return t('DashboardErrorsInvalidBatchDate', 'Batch date must be today or earlier');
    return '';
  };

  const logCatchMutation = useMutation({
  mutationFn: async (data) => {
    if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
    const catchData = {
      catch_id: data.catch_id,
      user_id: user.id,
      species: data.species,
      dryingMethod: data.dryingMethod,
      batchSize: parseFloat(data.batchSize),
      weight: parseFloat(data.weight),
      harvest_date: data.harvest_date,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      shelf_life: parseInt(data.shelf_life, 10),
      price: parseFloat(data.price),
      image_urls: [],
      quality_score: data.quality_score ? parseFloat(data.quality_score) : null,
      status: data.status || null,
    };

    if (data.images && data.images.length > 0) {
      catchData.image_urls = await Promise.all(
        Array.from(data.images).map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        })
      );
    }

    if (!isOnline) {
      await set('offlineActions', [
        ...(await get('offlineActions') || []),
        { type: 'catch_log', data: catchData },
      ]);
      return { message: t('DashboardSuccessOffline', 'Catch saved offline'), catch_id: catchData.catch_id };
    }

    // Submit to Laravel backend
    const laravelResponse = await createCatch(catchData);

    // Submit to Hyperledger Fabric
    const fabricData = {
      catchId: data.catch_id,
      fisherId: user.id,
      species: data.species,
      weightKg: data.weight.toString(),
      date: data.harvest_date,
    };
    const fabricResponse = await fetch('http://localhost:3000/submit-catch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fabricData),
    }).then(res => res.json());

    if (fabricResponse.error) {
      throw new Error(`Blockchain submission failed: ${fabricResponse.error}`);
    }

    return {
      message: t('DashboardSuccess', 'Catch logged successfully'),
      laravel: laravelResponse,
      fabric: fabricResponse,
    };
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries(['catches', user?.id]);
    reset({
      catch_id: `CATCH_${Date.now()}`,
      species: '',
      dryingMethod: '',
      batchSize: '',
      weight: '',
      harvest_date: new Date().toISOString().split('T')[0],
      shelf_life: '',
      price: '',
      lat: '',
      lng: '',
      images: [],
      quality_score: '',
      status: '',
    });
  },
  onError: (err) => {
    console.error('[FishermanDashboard] Log catch error:', err);
    Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'logCatch' } });
  },
});
  const createBatchMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      const validationError = validateBatchForm();
      if (validationError) throw new Error(validationError);

      const batchData = {
        batch_id: data.batch_id,
        catch_ids: data.catch_ids,
        user_id: user.id,
        batch_date: data.batch_date,
      };

      if (!isOnline) {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'batch_create', data: batchData },
        ]);
        return { message: t('DashboardSuccessOffline', 'Batch saved offline'), batch_id: batchData.batch_id };
      }

      return await createBatch(batchData);
    },
    onSuccess: (data) => {
      setSuccess(t('DashboardSuccess', `Batch ${data.batch_id} created successfully`));
      setBatchFormData({
        batch_id: `BATCH_${Date.now()}`,
        catch_ids: [],
        batch_date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries(['catches', user?.id]);
    },
    onError: (err) => {
      console.error('[FishermanDashboard] Create batch error:', err);
      Sentry.captureException(err, { extra: { component: 'FishermanDashboard', action: 'createBatch' } });
      setLocalError(err.message || t('DashboardErrorsGeneric', 'Failed to create batch.'));
    },
  });

  const handleCatchChange = (e) => {
    const { name, value } = e.target;
    if (['batchSize', 'weight', 'shelfLife', 'price', 'lat', 'lng'].includes(name) && value && isNaN(value)) return;
    setCatchFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    setSuccess('');
  };

  const handleBatchChange = (e) => {
    const { name, value } = e.target;
    setBatchFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    setSuccess('');
  };

  const handleCatchIdsChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setBatchFormData((prev) => ({ ...prev, catch_ids: selected }));
    setLocalError('');
    setSuccess('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (files.length > 5) {
      setLocalError(t('DashboardErrorsTooManyImages', 'Maximum 5 images allowed'));
      return;
    }
    if (files.some((file) => file.size > maxSize)) {
      setLocalError(t('DashboardErrorsImageSize', 'Each image must be less than 5MB'));
      return;
    }
    setCatchFormData((prev) => ({ ...prev, images: files }));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setLocalError('');
    setSuccess('');
  };

  const handleCatchReset = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setCatchFormData({
      catch_id: `CATCH_${Date.now()}`,
      species: '',
      dryingMethod: '',
      batchSize: '',
      weight: '',
      harvestDate: '',
      shelfLife: '',
      price: '',
      lat: '',
      lng: '',
      images: [],
    });
    setImagePreviews([]);
    setLocalError('');
    setSuccess('');
  };

  const handleBatchReset = () => {
    setBatchFormData({
      batch_id: `BATCH_${Date.now()}`,
      catch_ids: [],
      batch_date: new Date().toISOString().split('T')[0],
    });
    setLocalError('');
    setSuccess('');
  };

  const handleCatchSubmit = async (formData) => {
    try {
        const catchData = {
            catch_id: formData.catch_id,
            user_id: authState.user.id,
            species: formData.species,
            dryingMethod: formData.dryingMethod,
            batchSize: parseFloat(formData.batchSize),
            weight: parseFloat(formData.weight),
            harvest_date: formData.harvest_date || new Date().toISOString().split('T')[0],
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            shelf_life: formData.shelf_life ? parseInt(formData.shelf_life) : null,
            price: formData.price ? parseFloat(formData.price) : null,
            image_urls: formData.image_urls || null,
            quality_score: formData.quality_score ? parseFloat(formData.quality_score) : null,
            status: formData.status || null,
        };
        await authContext.createCatch(catchData);
        console.log('Catch submitted successfully');
    } catch (error) {
        console.error('Log catch error:', error);
    }
};

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    console.log('[FishermanDashboard] Batch form data on submit:', batchFormData);
    createBatchMutation.mutate(batchFormData);
  };

  if (!user || user.role !== 'fisherman') {
    return <ErrorMessage>{t('DashboardErrorsAccessDenied', 'Access denied: Only fishermen can access this dashboard')}</ErrorMessage>;
  }

  return (
    <StyleSheetManager shouldForwardProp={isPropValid}>
      <AnimatePresence>
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.5 }}
        >
          <DashboardWrapper theme={theme}>
            <DashboardCard>
              <Header>
                <Title>{t('DashboardTitle', 'Fisherman Dashboard')}</Title>
                <UserInfo>
                  {user?.name || 'User'} ({user?.role || 'N/A'})
                  <LogoutButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await logout();
                        navigate('/login', { replace: true });
                      } catch (err) {
                        setLocalError(t('DashboardErrorsLogout', 'Failed to logout.'));
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} /> {t('DashboardLogout', 'Logout')}
                  </LogoutButton>
                </UserInfo>
              </Header>
              <Tabs>
                <Tab active={activeTab === 'view'} onClick={() => setActiveTab('view')}>
                  {t('DashboardViewCatches', 'View Catches')}
                </Tab>
                <Tab active={activeTab === 'log'} onClick={() => setActiveTab('log')}>
                  {t('DashboardLogCatch', 'Log New Catch')}
                </Tab>
                <Tab active={activeTab === 'batch'} onClick={() => setActiveTab('batch')}>
                  {t('DashboardCreateBatch', 'Create Batch')}
                </Tab>
              </Tabs>
              <AnimatePresence>
                {error && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error}
                  </ErrorMessage>
                )}
                {geoError && (
                  <ErrorMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {geoError}
                  </ErrorMessage>
                )}
                {success && (
                  <SuccessMessage
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {success}
                  </SuccessMessage>
                )}
              </AnimatePresence>
              {activeTab === 'view' && (
                <div>
                  <FormGroup>
                    <Label htmlFor="filterStatus">
                      {t('DashboardFilterStatus', 'Filter by Status')}
                      <FontAwesomeIcon
                        icon={faFilter}
                        data-tooltip-id="filterStatus-tip"
                        data-tooltip-content={t('DashboardTooltipsFilterStatus', 'Filter catches by status')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">{t('DashboardAllStatuses', 'All Statuses')}</option>
                      <option value="pending">{t('DashboardStatusPending', 'Pending')}</option>
                      <option value="approved">{t('DashboardStatusApproved', 'Approved')}</option>
                      <option value="rejected">{t('DashboardStatusRejected', 'Rejected')}</option>
                    </Select>
                    <Tooltip id="filterStatus-tip" />
                  </FormGroup>
                  {catchesLoading ? (
                    <p>{t('DashboardLoading', 'Loading catches...')}</p>
                  ) : catchesError ? (
                    <ErrorMessage>{catchesError.message}</ErrorMessage>
                  ) : !catches || catches.length === 0 ? (
                    <p>{t('DashboardNoCatches', 'No catches found')}</p>
                  ) : (
                    <Table>
                      <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <Th key={header.id}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </Th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map((row) => (
                          <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <Td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <Pagination>
                    <div>
                      <span>
                        {t('DashboardPage', 'Page')} {table.getState().pagination.pageIndex + 1} {t('DashboardOf', 'of')}{' '}
                        {table.getPageCount()}
                      </span>
                    </div>
                    <div>
                      <PaginationButton
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FontAwesomeIcon icon={faArrowLeft} /> {t('DashboardPrevious', 'Previous')}
                      </PaginationButton>
                      <PaginationButton
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('DashboardNext', 'Next')} <FontAwesomeIcon icon={faArrowRight} />
                      </PaginationButton>
                    </div>
                  </Pagination>
                </div>
              )}
              {activeTab === 'log' && (
                <Form onSubmit={handleCatchSubmit}>
                  <FormGroup>
                    <Label htmlFor="catch_id">
                      {t('DashboardCatchId', 'Catch ID')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="catchId-tip"
                        data-tooltip-content={t('DashboardTooltipsCatchId', 'Unique identifier for the catch')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="catch_id"
                      type="text"
                      name="catch_id"
                      value={catchFormData.catch_id}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersCatchId', 'Enter catch ID')}
                      required
                    />
                    <Tooltip id="catchId-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="species">
                      {t('DashboardSpecies', 'Species')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="species-tip"
                        data-tooltip-content={t('DashboardTooltipsSpecies', 'Type of fish caught')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="species"
                      type="text"
                      name="species"
                      value={catchFormData.species}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersSpecies', 'Enter species')}
                      required
                    />
                    <Tooltip id="species-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="dryingMethod">
                      {t('DashboardDryingMethod', 'Drying Method')}
                    </Label>
                    <Select
                      id="dryingMethod"
                      name="dryingMethod"
                      value={catchFormData.dryingMethod}
                      onChange={handleCatchChange}
                      required
                    >
                      <option value="">{t('DashboardSelectDryingMethod', 'Select drying method')}</option>
                      <option value="sun">{t('DashboardDryingSun', 'Sun')}</option>
                      <option value="smoke">{t('DashboardDryingSmoke', 'Smoke')}</option>
                      <option value="freeze">{t('DashboardDryingFreeze', 'Freeze')}</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="batchSize">{t('DashboardBatchSize', 'Batch Size (kg)')}</Label>
                    <Input
                      id="batchSize"
                      type="number"
                      name="batchSize"
                      value={catchFormData.batchSize}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersBatchSize', 'Enter batch size')}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="weight">{t('DashboardWeight', 'Weight (kg)')}</Label>
                    <Input
                      id="weight"
                      type="number"
                      name="weight"
                      value={catchFormData.weight}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersWeight', 'Enter weight')}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="harvestDate">{t('DashboardHarvestDate', 'Harvest Date')}</Label>
                    <Input
                      id="harvestDate"
                      type="date"
                      name="harvestDate"
                      value={catchFormData.harvestDate}
                      onChange={handleCatchChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="shelfLife">{t('DashboardShelfLife', 'Shelf Life (days)')}</Label>
                    <Input
                      id="shelfLife"
                      type="number"
                      name="shelfLife"
                      value={catchFormData.shelfLife}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersShelfLife', 'Enter shelf life')}
                      min="1"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="price">{t('DashboardPrice', 'Price (USD)')}</Label>
                    <Input
                      id="price"
                      type="number"
                      name="price"
                      value={catchFormData.price}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersPrice', 'Enter price')}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="lat">{t('DashboardLatitude', 'Latitude')}</Label>
                    <Input
                      id="lat"
                      type="number"
                      name="lat"
                      value={catchFormData.lat}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersLatitude', 'Enter latitude')}
                      step="0.000001"
                      min="-90"
                      max="90"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="lng">{t('DashboardLongitude', 'Longitude')}</Label>
                    <Input
                      id="lng"
                      type="number"
                      name="lng"
                      value={catchFormData.lng}
                      onChange={handleCatchChange}
                      placeholder={t('DashboardPlaceholdersLongitude', 'Enter longitude')}
                      step="0.000001"
                      min="-180"
                      max="180"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="images">{t('DashboardImages', 'Images (max 5)')}</Label>
                    <Input
                      id="images"
                      type="file"
                      name="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    {imagePreviews.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {imagePreviews.map((preview, index) => (
                          <img key={index} src={preview} alt={`Preview ${index}`} style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                        ))}
                      </div>
                    )}
                  </FormGroup>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <Button
                      type="submit"
                      disabled={logCatchMutation.isLoading || !!validateCatchForm()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {logCatchMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardSubmit', 'Submit Catch')}
                    </Button>
                    <ResetButton
                      type="button"
                      onClick={handleCatchReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('DashboardReset', 'Reset')}
                    </ResetButton>
                  </div>
                </Form>
              )}
              {activeTab === 'batch' && (
                <Form onSubmit={handleBatchSubmit}>
                  <FormGroup>
                    <Label htmlFor="batch_id">
                      {t('DashboardBatchId', 'Batch ID')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="batchId-tip"
                        data-tooltip-content={t('DashboardTooltipsBatchId', 'Unique identifier for the batch')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="batch_id"
                      type="text"
                      name="batch_id"
                      value={batchFormData.batch_id}
                      onChange={handleBatchChange}
                      placeholder={t('DashboardPlaceholdersBatchId', 'Enter batch ID')}
                      required
                    />
                    <Tooltip id="batchId-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="catch_ids">
                      {t('DashboardCatchIds', 'Select Catches')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="catchIds-tip"
                        data-tooltip-content={t('DashboardTooltipsCatchIds', 'Select catches to include in the batch')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="catch_ids"
                      name="catch_ids"
                      multiple
                      value={batchFormData.catch_ids}
                      onChange={handleCatchIdsChange}
                      required
                    >
                      {catches?.map(catchItem => (
                        <option key={catchItem.catch_id} value={catchItem.catch_id}>
                          {catchItem.catch_id} ({catchItem.species})
                        </option>
                      ))}
                    </Select>
                    <Tooltip id="catchIds-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="batch_date">
                      {t('DashboardBatchDate', 'Batch Date')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="batchDate-tip"
                        data-tooltip-content={t('DashboardTooltipsBatchDate', 'Select the batch creation date')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="batch_date"
                      type="date"
                      name="batch_date"
                      value={batchFormData.batch_date}
                      onChange={handleBatchChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <Tooltip id="batchDate-tip" />
                  </FormGroup>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <Button
                      type="submit"
                      disabled={createBatchMutation.isLoading || !!validateBatchForm()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {createBatchMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardSubmitBatch', 'Submit Batch')}
                    </Button>
                    <ResetButton
                      type="button"
                      onClick={handleBatchReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('DashboardReset', 'Reset')}
                    </ResetButton>
                  </div>
                </Form>
              )}
            </DashboardCard>
          </DashboardWrapper>
        </motion.div>
      </AnimatePresence>
    </StyleSheetManager>
  );
};

export default FishermanDashboard;