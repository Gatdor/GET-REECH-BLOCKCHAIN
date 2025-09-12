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
import { AuthContext } from '../../context/AuthContext'; // Assumed to include market-related methods
import { ThemeContext } from '../../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

// Styled components (reused from FishermanDashboard with minor adjustments)
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

const MarketDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline, logout, createProduct, getProducts, updateOrder } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('view');
  const [productFormData, setProductFormData] = useState({
    product_id: `PROD_${Date.now()}`,
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    images: [],
  });
  const [orderFormData, setOrderFormData] = useState({
    order_id: '',
    status: '',
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (isOnline) {
      syncOfflineActions();
    }
    window.addEventListener('online', syncOfflineActions);
    return () => window.removeEventListener('online', syncOfflineActions);
  }, [isOnline]);

  const syncOfflineActions = async () => {
    try {
      const offlineActions = (await get('offlineActions')) || [];
      for (const action of offlineActions) {
        if (action.type === 'product_create') {
          await createProduct(action.data);
          const updatedActions = offlineActions.filter((a) => a.data.product_id !== action.data.product_id);
          await set('offlineActions', updatedActions);
        } else if (action.type === 'order_update') {
          await updateOrder(action.data);
          const updatedActions = offlineActions.filter((a) => a.data.order_id !== action.data.order_id);
          await set('offlineActions', updatedActions);
        }
      }
      if (offlineActions.length > 0) {
        setSuccess(t('DashboardSuccessOfflineSynced', 'Synced offline actions successfully!'));
        queryClient.invalidateQueries(['products', user?.id]);
        queryClient.invalidateQueries(['orders', user?.id]);
      }
    } catch (err) {
      console.error('[MarketDashboard] Sync error:', err);
      Sentry.captureException(err, { extra: { component: 'MarketDashboard', action: 'syncOfflineActions' } });
      setLocalError(t('DashboardErrorsSync', 'Failed to sync offline actions'));
    }
  };

  const { data: products, error: productsError, isLoading: productsLoading } = useQuery({
    queryKey: ['products', user?.id, filterStatus],
    queryFn: async () => {
      if (!isOnline) {
        const offlineActions = (await get('offlineActions')) || [];
        return offlineActions
          .filter(action => action.type === 'product_create')
          .map(action => ({
            ...action.data,
            status: 'pending',
            created_at: new Date().toISOString(),
          }));
      }
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      return await getProducts({ status: filterStatus || undefined });
    },
    enabled: !!user && user.role === 'seller' && activeTab === 'view',
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('[MarketDashboard] Fetch products error:', err);
      Sentry.captureException(err, { extra: { component: 'MarketDashboard', query: 'products' } });
      setLocalError(err.message || t('DashboardErrorsNetwork', 'Network error.'));
    },
  });

  const { data: orders, error: ordersError, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', user?.id, filterStatus],
    queryFn: async () => {
      if (!isOnline) {
        const offlineActions = (await get('offlineActions')) || [];
        return offlineActions
          .filter(action => action.type === 'order_update')
          .map(action => ({
            ...action.data,
            status: action.data.status || 'pending',
            updated_at: new Date().toISOString(),
          }));
      }
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      return await getProducts({ status: filterStatus || undefined }); // Assumes getProducts can fetch orders
    },
    enabled: !!user && user.role === 'seller' && activeTab === 'orders',
    retry: 1,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('[MarketDashboard] Fetch orders error:', err);
      Sentry.captureException(err, { extra: { component: 'MarketDashboard', query: 'orders' } });
      setLocalError(err.message || t('DashboardErrorsNetwork', 'Network error.'));
    },
  });

  const productColumns = useMemo(
    () => [
      { accessorKey: 'product_id', header: t('DashboardProductId', 'Product ID') },
      { accessorKey: 'name', header: t('DashboardProductName', 'Product Name') },
      { accessorKey: 'category', header: t('DashboardCategory', 'Category') },
      { accessorKey: 'price', header: t('DashboardPrice', 'Price (USD)') },
      { accessorKey: 'stock', header: t('DashboardStock', 'Stock') },
      { accessorKey: 'status', header: t('DashboardStatus', 'Status') },
      {
        id: 'actions',
        header: t('DashboardActions', 'Actions'),
        cell: ({ row }) => (
          <Button
            onClick={() => navigate(`/product-details/${row.original.product_id}`)}
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

  const orderColumns = useMemo(
    () => [
      { accessorKey: 'order_id', header: t('DashboardOrderId', 'Order ID') },
      { accessorKey: 'product_id', header: t('DashboardProductId', 'Product ID') },
      { accessorKey: 'quantity', header: t('DashboardQuantity', 'Quantity') },
      { accessorKey: 'total_price', header: t('DashboardTotalPrice', 'Total Price (USD)') },
      { accessorKey: 'status', header: t('DashboardStatus', 'Status') },
      {
        id: 'actions',
        header: t('DashboardActions', 'Actions'),
        cell: ({ row }) => (
          <Button
            onClick={() => navigate(`/order-details/${row.original.order_id}`)}
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

  const productTable = useReactTable({
    data: products || [],
    columns: productColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const orderTable = useReactTable({
    data: orders || [],
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const validateProductForm = () => {
    if (!productFormData.product_id.startsWith('PROD_')) return t('DashboardErrorsInvalidProductId', 'Product ID must start with PROD_');
    if (!productFormData.name) return t('DashboardErrorsNameRequired', 'Product name is required');
    if (!productFormData.category) return t('DashboardErrorsCategoryRequired', 'Category is required');
    if (!productFormData.price || isNaN(productFormData.price) || productFormData.price < 0.01) return t('DashboardErrorsInvalidPrice', 'Price must be at least 0.01');
    if (!productFormData.stock || isNaN(productFormData.stock) || productFormData.stock < 0) return t('DashboardErrorsInvalidStock', 'Stock must be at least 0');
    if (productFormData.images.length > 5) return t('DashboardErrorsTooManyImages', 'Maximum 5 images allowed');
    return '';
  };

  const validateOrderForm = () => {
    if (!orderFormData.order_id) return t('DashboardErrorsOrderIdRequired', 'Order ID is required');
    if (!orderFormData.status) return t('DashboardErrorsStatusRequired', 'Status is required');
    return '';
  };

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      const validationError = validateProductForm();
      if (validationError) throw new Error(validationError);

      const productData = {
        product_id: data.product_id,
        user_id: user.id,
        name: data.name,
        category: data.category,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
        description: data.description || '',
        image_urls: [],
      };

      if (data.images && data.images.length > 0) {
        productData.image_urls = await Promise.all(
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
          { type: 'product_create', data: productData },
        ]);
        return { message: t('DashboardSuccessOffline', 'Product saved offline'), product_id: productData.product_id };
      }

      return await createProduct(productData);
    },
    onSuccess: (data) => {
      setSuccess(t('DashboardSuccess', `Product ${data.product_id} created successfully`));
      setProductFormData({
        product_id: `PROD_${Date.now()}`,
        name: '',
        category: '',
        price: '',
        stock: '',
        description: '',
        images: [],
      });
      setImagePreviews([]);
      queryClient.invalidateQueries(['products', user?.id]);
    },
    onError: (err) => {
      console.error('[MarketDashboard] Create product error:', err);
      Sentry.captureException(err, { extra: { component: 'MarketDashboard', action: 'createProduct' } });
      setLocalError(err.message || t('DashboardErrorsGeneric', 'Failed to create product.'));
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) throw new Error(t('DashboardErrorsUnauthenticated', 'You must be logged in'));
      const validationError = validateOrderForm();
      if (validationError) throw new Error(validationError);

      const orderData = {
        order_id: data.order_id,
        status: data.status,
        user_id: user.id,
      };

      if (!isOnline) {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'order_update', data: orderData },
        ]);
        return { message: t('DashboardSuccessOffline', 'Order update saved offline'), order_id: orderData.order_id };
      }

      return await updateOrder(orderData);
    },
    onSuccess: (data) => {
      setSuccess(t('DashboardSuccess', `Order ${data.order_id} updated successfully`));
      setOrderFormData({ order_id: '', status: '' });
      queryClient.invalidateQueries(['orders', user?.id]);
    },
    onError: (err) => {
      console.error('[MarketDashboard] Update order error:', err);
      Sentry.captureException(err, { extra: { component: 'MarketDashboard', action: 'updateOrder' } });
      setLocalError(err.message || t('DashboardErrorsGeneric', 'Failed to update order.'));
    },
  });

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    if (['price', 'stock'].includes(name) && value && isNaN(value)) return;
    setProductFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    setSuccess('');
  };

  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    setOrderFormData((prev) => ({ ...prev, [name]: value }));
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
    setProductFormData((prev) => ({ ...prev, images: files }));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setLocalError('');
    setSuccess('');
  };

  const handleProductReset = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setProductFormData({
      product_id: `PROD_${Date.now()}`,
      name: '',
      category: '',
      price: '',
      stock: '',
      description: '',
      images: [],
    });
    setImagePreviews([]);
    setLocalError('');
    setSuccess('');
  };

  const handleOrderReset = () => {
    setOrderFormData({ order_id: '', status: '' });
    setLocalError('');
    setSuccess('');
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    createProductMutation.mutate(productFormData);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    updateOrderMutation.mutate(orderFormData);
  };

  if (!user || user.role !== 'seller') {
    return <ErrorMessage>{t('DashboardErrorsAccessDenied', 'Access denied: Only sellers can access this dashboard')}</ErrorMessage>;
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
                <Title>{t('DashboardTitle', 'Market Dashboard')}</Title>
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
                  {t('DashboardViewProducts', 'View Products')}
                </Tab>
                <Tab active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
                  {t('DashboardListProduct', 'List New Product')}
                </Tab>
                <Tab active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}>
                  {t('DashboardManageOrders', 'Manage Orders')}
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
                        data-tooltip-content={t('DashboardTooltipsFilterStatus', 'Filter products by status')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">{t('DashboardAllStatuses', 'All Statuses')}</option>
                      <option value="active">{t('DashboardStatusActive', 'Active')}</option>
                      <option value="inactive">{t('DashboardStatusInactive', 'Inactive')}</option>
                      <option value="out_of_stock">{t('DashboardStatusOutOfStock', 'Out of Stock')}</option>
                    </Select>
                    <Tooltip id="filterStatus-tip" />
                  </FormGroup>
                  {productsLoading ? (
                    <p>{t('DashboardLoading', 'Loading products...')}</p>
                  ) : productsError ? (
                    <ErrorMessage>{productsError.message}</ErrorMessage>
                  ) : !products || products.length === 0 ? (
                    <p>{t('DashboardNoProducts', 'No products found')}</p>
                  ) : (
                    <Table>
                      <thead>
                        {productTable.getHeaderGroups().map((headerGroup) => (
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
                        {productTable.getRowModel().rows.map((row) => (
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
                        {t('DashboardPage', 'Page')} {productTable.getState().pagination.pageIndex + 1} {t('DashboardOf', 'of')}{' '}
                        {productTable.getPageCount()}
                      </span>
                    </div>
                    <div>
                      <PaginationButton
                        onClick={() => productTable.previousPage()}
                        disabled={!productTable.getCanPreviousPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FontAwesomeIcon icon={faArrowLeft} /> {t('DashboardPrevious', 'Previous')}
                      </PaginationButton>
                      <PaginationButton
                        onClick={() => productTable.nextPage()}
                        disabled={!productTable.getCanNextPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('DashboardNext', 'Next')} <FontAwesomeIcon icon={faArrowRight} />
                      </PaginationButton>
                    </div>
                  </Pagination>
                </div>
              )}
              {activeTab === 'list' && (
                <Form onSubmit={handleProductSubmit}>
                  <FormGroup>
                    <Label htmlFor="product_id">
                      {t('DashboardProductId', 'Product ID')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="productId-tip"
                        data-tooltip-content={t('DashboardTooltipsProductId', 'Unique identifier for the product')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="product_id"
                      type="text"
                      name="product_id"
                      value={productFormData.product_id}
                      onChange={handleProductChange}
                      placeholder={t('DashboardPlaceholdersProductId', 'Enter product ID')}
                      required
                    />
                    <Tooltip id="productId-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="name">
                      {t('DashboardProductName', 'Product Name')}
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        data-tooltip-id="name-tip"
                        data-tooltip-content={t('DashboardTooltipsProductName', 'Name of the product')}
                        style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                      />
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      name="name"
                      value={productFormData.name}
                      onChange={handleProductChange}
                      placeholder={t('DashboardPlaceholdersProductName', 'Enter product name')}
                      required
                    />
                    <Tooltip id="name-tip" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="category">
                      {t('DashboardCategory', 'Category')}
                    </Label>
                    <Select
                      id="category"
                      name="category"
                      value={productFormData.category}
                      onChange={handleProductChange}
                      required
                    >
                      <option value="">{t('DashboardSelectCategory', 'Select category')}</option>
                      <option value="electronics">{t('DashboardCategoryElectronics', 'Electronics')}</option>
                      <option value="clothing">{t('DashboardCategoryClothing', 'Clothing')}</option>
                      <option value="food">{t('DashboardCategoryFood', 'Food')}</option>
                      <option value="home">{t('DashboardCategoryHome', 'Home')}</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="price">{t('DashboardPrice', 'Price (USD)')}</Label>
                    <Input
                      id="price"
                      type="number"
                      name="price"
                      value={productFormData.price}
                      onChange={handleProductChange}
                      placeholder={t('DashboardPlaceholdersPrice', 'Enter price')}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="stock">{t('DashboardStock', 'Stock')}</Label>
                    <Input
                      id="stock"
                      type="number"
                      name="stock"
                      value={productFormData.stock}
                      onChange={handleProductChange}
                      placeholder={t('DashboardPlaceholdersStock', 'Enter stock quantity')}
                      min="0"
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="description">{t('DashboardDescription', 'Description')}</Label>
                    <Input
                      id="description"
                      type="text"
                      name="description"
                      value={productFormData.description}
                      onChange={handleProductChange}
                      placeholder={t('DashboardPlaceholdersDescription', 'Enter product description')}
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
                      disabled={createProductMutation.isLoading || !!validateProductForm()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {createProductMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardSubmitProduct', 'Submit Product')}
                    </Button>
                    <ResetButton
                      type="button"
                      onClick={handleProductReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t('DashboardReset', 'Reset')}
                    </ResetButton>
                  </div>
                </Form>
              )}
              {activeTab === 'orders' && (
                <div>
                  <FormGroup>
                    <Label htmlFor="filterStatus">
                      {t('DashboardFilterStatus', 'Filter by Status')}
                      <FontAwesomeIcon
                        icon={faFilter}
                        data-tooltip-id="filterStatus-tip"
                        data-tooltip-content={t('DashboardTooltipsFilterStatus', 'Filter orders by status')}
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
                      <option value="shipped">{t('DashboardStatusShipped', 'Shipped')}</option>
                      <option value="delivered">{t('DashboardStatusDelivered', 'Delivered')}</option>
                      <option value="cancelled">{t('DashboardStatusCancelled', 'Cancelled')}</option>
                    </Select>
                    <Tooltip id="filterStatus-tip" />
                  </FormGroup>
                  {ordersLoading ? (
                    <p>{t('DashboardLoading', 'Loading orders...')}</p>
                  ) : ordersError ? (
                    <ErrorMessage>{ordersError.message}</ErrorMessage>
                  ) : !orders || orders.length === 0 ? (
                    <p>{t('DashboardNoOrders', 'No orders found')}</p>
                  ) : (
                    <Table>
                      <thead>
                        {orderTable.getHeaderGroups().map((headerGroup) => (
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
                        {orderTable.getRowModel().rows.map((row) => (
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
                        {t('DashboardPage', 'Page')} {orderTable.getState().pagination.pageIndex + 1} {t('DashboardOf', 'of')}{' '}
                        {orderTable.getPageCount()}
                      </span>
                    </div>
                    <div>
                      <PaginationButton
                        onClick={() => orderTable.previousPage()}
                        disabled={!orderTable.getCanPreviousPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FontAwesomeIcon icon={faArrowLeft} /> {t('DashboardPrevious', 'Previous')}
                      </PaginationButton>
                      <PaginationButton
                        onClick={() => orderTable.nextPage()}
                        disabled={!orderTable.getCanNextPage()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('DashboardNext', 'Next')} <FontAwesomeIcon icon={faArrowRight} />
                      </PaginationButton>
                    </div>
                  </Pagination>
                  <Form onSubmit={handleOrderSubmit}>
                    <FormGroup>
                      <Label htmlFor="order_id">
                        {t('DashboardOrderId', 'Order ID')}
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          data-tooltip-id="orderId-tip"
                          data-tooltip-content={t('DashboardTooltipsOrderId', 'Select an order to update')}
                          style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                        />
                      </Label>
                      <Select
                        id="order_id"
                        name="order_id"
                        value={orderFormData.order_id}
                        onChange={handleOrderChange}
                        required
                      >
                        <option value="">{t('DashboardSelectOrder', 'Select order')}</option>
                        {orders?.map(order => (
                          <option key={order.order_id} value={order.order_id}>
                            {order.order_id}
                          </option>
                        ))}
                      </Select>
                      <Tooltip id="orderId-tip" />
                    </FormGroup>
                    <FormGroup>
                      <Label htmlFor="status">
                        {t('DashboardStatus', 'Status')}
                      </Label>
                      <Select
                        id="status"
                        name="status"
                        value={orderFormData.status}
                        onChange={handleOrderChange}
                        required
                      >
                        <option value="">{t('DashboardSelectStatus', 'Select status')}</option>
                        <option value="pending">{t('DashboardStatusPending', 'Pending')}</option>
                        <option value="shipped">{t('DashboardStatusShipped', 'Shipped')}</option>
                        <option value="delivered">{t('DashboardStatusDelivered', 'Delivered')}</option>
                        <option value="cancelled">{t('DashboardStatusCancelled', 'Cancelled')}</option>
                      </Select>
                    </FormGroup>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                      <Button
                        type="submit"
                        disabled={updateOrderMutation.isLoading || !!validateOrderForm()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {updateOrderMutation.isLoading ? t('DashboardSubmitting', 'Submitting...') : t('DashboardUpdateOrder', 'Update Order')}
                      </Button>
                      <ResetButton
                        type="button"
                        onClick={handleOrderReset}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('DashboardReset', 'Reset')}
                      </ResetButton>
                    </div>
                  </Form>
                </div>
              )}
            </DashboardCard>
          </DashboardWrapper>
        </motion.div>
      </AnimatePresence>
      </StyleSheetManager>
  );
}

export default MarketDashboard;