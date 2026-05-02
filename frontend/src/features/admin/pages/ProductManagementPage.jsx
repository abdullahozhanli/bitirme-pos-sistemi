import React, { useState, useEffect, useMemo } from 'react'; 
import axios from 'axios';
import { 
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Typography, Paper, Stack
} from '@mui/material'; 
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import TableToolbar from '../../../shared/components/ui/TableToolbar.jsx';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Tüm ürünler (filtreleme için)
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // Arama için
  const [newProductData, setNewProductData] = useState({
    name: '', price: '', description: '', category: '', countInStock: 0, imageUrl: '',
  });
  const [openEditModal, setOpenEditModal] = useState(false); 
  const [editingProductData, setEditingProductData] = useState(null);
  const [confirm, setConfirm] = useState({ open: false }); 

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/products', { params: { page: 1, limit: 200 } });
      const list = Array.isArray(response.data) ? response.data : response.data.items || [];
      const productsWithId = list.map(p => (p ? { id: p._id, ...p } : null)).filter(Boolean);
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
        if (catList.length > 0) {
          setNewProductData(prevData => ({
            ...prevData,
            category: catList[0]._id 
          }));
        }
      } catch (error) {
        console.error('Kategoriler çekilirken hata oluştu:', error);
      }
    };
    fetchProducts();
    fetchCategories();
  }, []);

  // Arama için useEffect
  useEffect(() => {
    if (searchQuery === '') {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setProducts(filtered);
    }
  }, [searchQuery, allProducts]); 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProductData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const productPayload = {
        ...newProductData,
        price: Number(newProductData.price),
        countInStock: Number(newProductData.countInStock)
      };
      
      await axios.post('/api/admin/products', productPayload);
      setNewProductData({
        name: '', price: '', description: '', countInStock: 0, imageUrl: '',
        category: categories.length > 0 ? categories[0]._id : ''
      });
      setMessage('Ürün başarıyla eklendi!');
      // Ürünleri yeniden yükle
      await fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    setMessage('');
    setLoading(true);
    try {
      await axios.delete(`/api/admin/products/${id}`);
      setMessage('Ürün başarıyla silindi.');
      // Silme işleminden sonra ürünleri yeniden yükle
      await fetchProducts();
    } catch (error) {
      console.error('Ürün silme hatası:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Ürün silinirken bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
      setLoading(false);
      // Hata durumunda da ürünleri yeniden yükle
      await fetchProducts();
    }
  };

  const handleOpenEditModal = (product) => {
    setEditingProductData({ 
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description || '',
      countInStock: product.countInStock,
      imageUrl: product.imageUrl || '',
      category: product.category ? (product.category._id || product.category) : product.category || ''
    });
    setOpenEditModal(true); 
  };

  const handleEditModalInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProductData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleUpdateProduct = async () => {
    setMessage('');
    try {
      const updatePayload = {
        ...editingProductData,
        price: Number(editingProductData.price),
        countInStock: Number(editingProductData.countInStock)
      };
      
      await axios.put(`/api/admin/products/${editingProductData.id}`, updatePayload);
      setMessage('Ürün başarıyla güncellendi.');
      setOpenEditModal(false); 
      setEditingProductData(null);
      // Ürünleri yeniden yükle
      await fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  // --- DataGrid SÜTUN TANIMLARI ---
  const columns = useMemo(() => [
    { field: 'name', headerName: 'Adı', width: 200 },
    { 
      field: 'price', 
      headerName: 'Fiyatı', 
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => `${params.value} TL`
    },
    { 
      field: 'countInStock', 
      headerName: 'Stok', 
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => {
        const stock = params.value || 0;
        if (stock === 0) {
          return <span className="stock-badge stock-zero">{stock}</span>;
        } else if (stock < 10) {
          return <span className="stock-badge stock-low">{stock}</span>;
        }
        return <span className="stock-text">{stock}</span>;
      }
    },
    { 
      field: 'category', 
      headerName: 'Kategori', 
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const category = params.row?.category;
        let categoryName = 'N/A';
        
        // Eğer category bir obje ise (populate edilmişse)
        if (category && typeof category === 'object' && category !== null) {
          if (category.name) {
            categoryName = category.name;
          } else if (category._id) {
            // Eğer obje ama name yoksa, categories listesinden bul
            const foundCat = categories.find(cat => 
              String(cat._id) === String(category._id)
            );
            categoryName = foundCat ? foundCat.name : 'N/A';
          }
        } 
        // Eğer category bir ID string ise, categories listesinden bul
        else if (category) {
          const categoryId = typeof category === 'string' ? category : (category?._id || category);
          if (categoryId) {
            const foundCat = categories.find(cat => String(cat._id) === String(categoryId));
            if (foundCat) {
              categoryName = foundCat.name;
            }
          }
        }
        
        return <span>{categoryName}</span>;
      }
    },
    { 
      field: 'description', 
      headerName: 'Açıklama', 
      width: 250,
      renderCell: (params) => (
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          display: 'block',
          maxWidth: '100%'
        }}>
          {params.value || ''}
        </span>
      )
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        return (
          <Stack direction="row" spacing={1}>
            <Button
              onClick={() => handleOpenEditModal(params.row)}
              size="small"
              variant="contained"
              color="primary"
            >
              Düzenle
            </Button>
            <Button 
              onClick={() => setConfirm({
                open: true,
                title: 'Ürünü Sil',
                description: `"${params.row.name}" adlı ürünü silmek istediğinizden emin misiniz?`,
                onConfirm: () => {
                  setConfirm({ open: false });
                  handleDeleteProduct(params.row.id);
                }
              })} 
              size="small" 
              variant="contained" 
              color="error"
            >
              Sil
            </Button>
          </Stack>
        );
      }
    }
  ], [categories]);

  // --- EKRANA ÇİZDİR (RENDER) ---
  return (
    <Paper sx={{ p: 3 }}>
      {/* Yeni Ürün Ekle Formu */}
      <Typography variant="h5" component="h2" gutterBottom>
        Yeni Ürün Ekle
      </Typography>
      {message && <Typography color={message.startsWith('Hata:') ? 'error' : 'success'} gutterBottom sx={{ mb: 2 }}>{message}</Typography>}
      <Box component="form" onSubmit={handleCreateProduct} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <TextField label="Adı" name="name" value={newProductData.name} onChange={handleInputChange} required size="small" />
        <TextField label="Fiyatı (TL)" name="price" type="number" value={newProductData.price} onChange={handleInputChange} required size="small" />
        <TextField label="Stok Adedi" name="countInStock" type="number" value={newProductData.countInStock} onChange={handleInputChange} required size="small" />
        <TextField label="Görsel URL" name="imageUrl" value={newProductData.imageUrl} onChange={handleInputChange} required size="small" placeholder="https://..." sx={{ minWidth: 300 }} />
        <TextField label="Açıklama" name="description" value={newProductData.description} onChange={handleInputChange} size="small" />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Kategorisi</InputLabel>
          <Select name="category" value={newProductData.category} label="Kategorisi" onChange={handleInputChange} required>
            {categories.map((category) => (
              <MenuItem key={category._id} value={category._id}>{category.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" color="success">Ekle</Button>
      </Box>

      <Box sx={{ my: 3, borderTop: '1px solid', borderColor: 'divider' }} />

      {/* DataGrid Tablosu */}
      <Typography variant="h5" component="h2" gutterBottom>
        Mevcut Ürünler
      </Typography>
      <TableToolbar 
        value={searchQuery} 
        onChange={setSearchQuery} 
        placeholder="Ürün ara..."
      />
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

      {/* Düzenleme Dialog */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ürünü Düzenle</DialogTitle>
        <DialogContent>
          {editingProductData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Adı" name="name" value={editingProductData.name} onChange={handleEditModalInputChange} fullWidth />
              <TextField label="Fiyatı (TL)" name="price" type="number" value={editingProductData.price} onChange={handleEditModalInputChange} fullWidth />
              <TextField label="Stok Adedi" name="countInStock" type="number" value={editingProductData.countInStock} onChange={handleEditModalInputChange} fullWidth />
              <TextField label="Görsel URL" name="imageUrl" value={editingProductData.imageUrl || ''} onChange={handleEditModalInputChange} fullWidth placeholder="https://..." />
              <TextField label="Açıklama" name="description" value={editingProductData.description} onChange={handleEditModalInputChange} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Kategorisi</InputLabel> 
                <Select name="category" value={editingProductData.category} label="Kategorisi" onChange={handleEditModalInputChange}>
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>{category.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditModal(false)}>İptal</Button>
          <Button onClick={handleUpdateProduct} variant="contained" color="primary">Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Onay Dialog */}
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