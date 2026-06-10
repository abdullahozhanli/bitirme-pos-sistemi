import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import TableToolbar from '../../../shared/components/ui/TableToolbar.jsx';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';
import ProductFormDialog, { createEmptyProductForm } from '../components/ProductFormDialog.jsx';
import {
  toNutritionPayload,
  nutritionToForm,
  resolveNutritionStatusForSave,
  nutritionStatusLabel,
  AI_ESTIMATE_SUCCESS_MSG,
} from '../utils/productNutrition.js';

function buildProductPayload(formData, previousNutritionStatus = 'none') {
  const nutritionStatus = resolveNutritionStatusForSave(
    formData.nutrition,
    previousNutritionStatus
  );
  const nutrition = toNutritionPayload({
    ...formData.nutrition,
    isNutritionVisibleToCustomer: nutritionStatus === 'approved',
  });

  return {
    name: formData.name,
    price: Number(formData.price),
    description: formData.description,
    imageUrl: formData.imageUrl,
    category: formData.category,
    countInStock: Number(formData.countInStock),
    isVisibleToCustomer: formData.isVisibleToCustomer !== false,
    nutritionStatus,
    nutrition,
  };
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitialData, setFormInitialData] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [aiEstimateLoading, setAiEstimateLoading] = useState(false);
  const [aiEstimateInfo, setAiEstimateInfo] = useState('');
  const [aiEstimateError, setAiEstimateError] = useState('');
  const [confirm, setConfirm] = useState({ open: false });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/products', { params: { page: 1, limit: 200 } });
      const list = Array.isArray(response.data) ? response.data : response.data.items || [];
      const productsWithId = list.map((p) => (p ? { id: p._id, ...p } : null)).filter(Boolean);
      setAllProducts(productsWithId);
      setProducts(productsWithId);
      setLoading(false);
    } catch (error) {
      console.error('Ürünler çekilirken hata oluştu:', error);
      setMessage('Ürünler yüklenemedi.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/admin/categories');
        const catList = Array.isArray(response.data) ? response.data : response.data.items || [];
        setCategories(catList);
      } catch (error) {
        console.error('Kategoriler çekilirken hata oluştu:', error);
      }
    };
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery === '') {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setProducts(filtered);
    }
  }, [searchQuery, allProducts]);

  const closeFormDialog = useCallback(() => {
    setFormDialogOpen(false);
    setFormInitialData(null);
    setAiEstimateInfo('');
    setAiEstimateError('');
  }, []);

  const openCreateDialog = () => {
    setFormMode('create');
    setFormInitialData(
      createEmptyProductForm(categories.length > 0 ? categories[0]._id : '')
    );
    setAiEstimateInfo('');
    setAiEstimateError('');
    setFormDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setFormMode('edit');
    setFormInitialData({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || '',
      countInStock: product.countInStock,
      imageUrl: product.imageUrl || '',
      category: product.category
        ? product.category._id || product.category
        : product.category || '',
      isVisibleToCustomer: product.isVisibleToCustomer !== false,
      nutritionStatus: product.nutritionStatus || 'none',
      nutrition: nutritionToForm(product.nutrition),
    });
    setAiEstimateInfo('');
    setAiEstimateError('');
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setMessage('');
    setFormSubmitting(true);
    try {
      const previousStatus = formInitialData?.nutritionStatus || 'none';
      const payload = buildProductPayload(formData, previousStatus);

      if (formMode === 'create') {
        await axios.post('/api/admin/products', payload);
        setMessage('Ürün başarıyla eklendi!');
      } else {
        await axios.put(`/api/admin/products/${formData.id}`, payload);
        setMessage('Ürün başarıyla güncellendi.');
      }

      closeFormDialog();
      await fetchProducts();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const applyAiEstimateToForm = (currentFormData, data) => {
    const nutritionPayload = data.nutrition || data.product?.nutrition;
    if (!nutritionPayload || typeof nutritionPayload !== 'object') {
      throw new Error('AI yanıtında besin değeri bulunamadı.');
    }

    setFormInitialData({
      ...currentFormData,
      nutritionStatus: data.nutritionStatus || 'estimated',
      nutrition: nutritionToForm({
        ...nutritionPayload,
        source: nutritionPayload.source || 'ai_estimate',
        isNutritionVisibleToCustomer: false,
      }),
    });
    setAiEstimateInfo(data.message || AI_ESTIMATE_SUCCESS_MSG);
  };

  const handleAiNutritionEstimate = async (currentFormData) => {
    if (!String(currentFormData?.name || '').trim()) return;

    setAiEstimateLoading(true);
    setAiEstimateInfo('');
    setAiEstimateError('');
    try {
      let response;
      if (formMode === 'edit' && currentFormData.id) {
        response = await axios.post(
          `/api/admin/products/${currentFormData.id}/nutrition/estimate`
        );
      } else {
        response = await axios.post('/api/admin/products/nutrition/estimate-preview', {
          name: currentFormData.name,
          description: currentFormData.description,
          price: currentFormData.price,
          category: currentFormData.category,
          nutrition: currentFormData.nutrition,
        });
      }

      applyAiEstimateToForm(currentFormData, response.data || {});
    } catch (error) {
      const backendMsg = error.response?.data?.message || error.response?.data?.msg;
      const errorMsg = backendMsg || error.message || 'AI kalori tahmini oluşturulamadı.';
      setAiEstimateError(errorMsg);
    } finally {
      setAiEstimateLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setMessage('');
    setLoading(true);
    try {
      await axios.delete(`/api/admin/products/${id}`);
      setMessage('Ürün başarıyla silindi.');
      await fetchProducts();
    } catch (error) {
      console.error('Ürün silme hatası:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.msg ||
        'Ürün silinirken bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
      setLoading(false);
      await fetchProducts();
    }
  };

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Adı', width: 180, flex: 1, minWidth: 140 },
      {
        field: 'price',
        headerName: 'Fiyatı',
        width: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => `${params.value} TL`,
      },
      {
        field: 'countInStock',
        headerName: 'Stok',
        width: 80,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const stock = params.value || 0;
          if (stock === 0) {
            return <span className="stock-badge stock-zero">{stock}</span>;
          }
          if (stock < 10) {
            return <span className="stock-badge stock-low">{stock}</span>;
          }
          return <span className="stock-text">{stock}</span>;
        },
      },
      {
        field: 'category',
        headerName: 'Kategori',
        width: 130,
        sortable: false,
        renderCell: (params) => {
          const category = params.row?.category;
          let categoryName = 'N/A';

          if (category && typeof category === 'object' && category !== null) {
            if (category.name) {
              categoryName = category.name;
            } else if (category._id) {
              const foundCat = categories.find(
                (cat) => String(cat._id) === String(category._id)
              );
              categoryName = foundCat ? foundCat.name : 'N/A';
            }
          } else if (category) {
            const categoryId =
              typeof category === 'string' ? category : category?._id || category;
            if (categoryId) {
              const foundCat = categories.find((cat) => String(cat._id) === String(categoryId));
              if (foundCat) categoryName = foundCat.name;
            }
          }

          return <span>{categoryName}</span>;
        },
      },
      {
        field: 'isVisibleToCustomer',
        headerName: 'Menü',
        width: 90,
        sortable: false,
        renderCell: (params) =>
          params.row.isVisibleToCustomer !== false ? (
            <Chip label="Görünür" size="small" color="success" variant="outlined" />
          ) : (
            <Chip label="Gizli" size="small" variant="outlined" />
          ),
      },
      {
        field: 'nutritionStatus',
        headerName: 'Besin',
        width: 100,
        sortable: false,
        renderCell: (params) => {
          const label = nutritionStatusLabel(
            params.row.nutritionStatus,
            params.row.nutrition
          );
          const color =
            label === 'Yayında' ? 'success' : label === 'Taslak' ? 'warning' : 'default';
          return <Chip label={label} size="small" color={color} variant="outlined" />;
        },
      },
      {
        field: 'description',
        headerName: 'Açıklama',
        width: 200,
        flex: 1,
        minWidth: 120,
        renderCell: (params) => (
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: '100%',
            }}
          >
            {params.value || ''}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'İşlemler',
        width: 200,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => openEditDialog(params.row)}
              size="small"
              variant="contained"
              color="primary"
            >
              Düzenle
            </Button>
            <Button
              onClick={() =>
                setConfirm({
                  open: true,
                  title: 'Ürünü Sil',
                  description: `"${params.row.name}" adlı ürünü silmek istediğinizden emin misiniz?`,
                  onConfirm: () => {
                    setConfirm({ open: false });
                    handleDeleteProduct(params.row.id);
                  },
                })
              }
              size="small"
              variant="contained"
              color="error"
            >
              Sil
            </Button>
          </Stack>
        ),
      },
    ],
    [categories]
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h2">
          Ürün Yönetimi
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Yeni Ürün
        </Button>
      </Box>

      {message ? (
        <Alert
          severity={message.startsWith('Hata:') ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setMessage('')}
        >
          {message.replace(/^Hata:\s*/, '')}
        </Alert>
      ) : null}

      <TableToolbar value={searchQuery} onChange={setSearchQuery} placeholder="Ürün ara..." />

      <Box sx={{ height: 600, width: '100%', mt: 2 }}>
        <DataGrid
          rows={products || []}
          columns={columns}
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
          disableRowSelectionOnClick
        />
      </Box>

      <ProductFormDialog
        open={formDialogOpen}
        mode={formMode}
        initialData={formInitialData}
        categories={categories}
        submitting={formSubmitting}
        onClose={closeFormDialog}
        onSubmit={handleFormSubmit}
        onAiEstimate={handleAiNutritionEstimate}
        aiEstimateLoading={aiEstimateLoading}
        aiEstimateInfo={aiEstimateInfo}
        aiEstimateError={aiEstimateError}
      />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onClose={() => setConfirm({ open: false })}
        onConfirm={confirm.onConfirm}
      />
    </Paper>
  );
}
