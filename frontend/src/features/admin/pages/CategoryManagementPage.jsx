import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Stack } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import ConfirmDialog from '../../../shared/components/ui/ConfirmDialog.jsx';

export default function CategoryManagementPage() {
  // --- DURUMLAR (STATE) ---
  const [categories, setCategories] = useState([]); 
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // YENİ: "Yeni Kategori Ekle" formu için
  const [newCategoryName, setNewCategoryName] = useState('');

  // YENİ: "Düzenle" Dialog için
  const [openEditModal, setOpenEditModal] = useState(false); 
  const [editingCategoryData, setEditingCategoryData] = useState(null);
  const [confirm, setConfirm] = useState({ open: false });

  // --- EFEKTLER (EFFECT) ---
  // Sayfa ilk yüklendiğinde kategorileri çeker
  useEffect(() => {
    setLoading(true);
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/admin/categories');
        const categoriesWithId = response.data.map(c => ({ id: c._id, ...c }));
        setCategories(categoriesWithId);
        setLoading(false);
      } catch (error) {
        console.error('Kategoriler çekilirken hata oluştu:', error);
        setMessage('Kategoriler yüklenemedi.');
        setLoading(false);
      }
    };
    fetchCategories();
  }, []); 


  // --- FONKSİYONLAR (HANDLERS) ---

  // YENİ: Yeni Kategori Ekleme
  const handleCreateCategory = async (e) => {
    e.preventDefault(); 
    setMessage(''); 
    try {
      const response = await axios.post('/api/admin/categories', { name: newCategoryName });

      const newCat = { id: response.data._id, ...response.data };
      setCategories([newCat, ...categories]);
      setNewCategoryName('');
      setMessage('Kategori başarıyla eklendi!');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  // YENİ: Kategori Silme
  const handleDeleteCategory = async (id) => {
    setMessage('');
    try {
      await axios.delete(`/api/admin/categories/${id}`);
      setCategories(categories.filter((category) => category.id !== id));
      setMessage('Kategori başarıyla silindi.');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  // YENİ: "Düzenle" butonuna basıldığında Modal'ı açar
  const handleOpenEditModal = (category) => {
    setEditingCategoryData(category); // { id: '...', name: '...' }
    setOpenEditModal(true); // Modal'ı aç
  };

  // YENİ: Modal'daki input'lar değişince
  const handleEditModalInputChange = (e) => {
    setEditingCategoryData({
      ...editingCategoryData,
      name: e.target.value
    });
  };

  // YENİ: "Düzenlemeyi Kaydet" butonuna basıldığında
  const handleUpdateCategory = async () => {
    setMessage('');
    try {
      const response = await axios.put(`/api/admin/categories/${editingCategoryData.id}`, { name: editingCategoryData.name });

      const updatedCat = { id: response.data._id, ...response.data };

      setCategories(
        categories.map((category) =>
          category.id === updatedCat.id ? updatedCat : category
        )
      );
      setMessage('Kategori başarıyla güncellendi.');
      setOpenEditModal(false); 
      setEditingCategoryData(null);

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.msg || 'Bir hata oluştu.';
      setMessage(`Hata: ${errorMsg}`);
    }
  };

  // --- YENİ: DataGrid SÜTUN TANIMLARI ---
  const columns = [
    { field: 'name', headerName: 'Kategori Adı', width: 300 },
    { 
      field: 'createdAt', 
      headerName: 'Oluşturma Tarihi', 
      width: 200,
      renderCell: (params) => new Date(params.value).toLocaleString('tr-TR')
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
                title: 'Kategoriyi Sil',
                description: `"${params.row.name}" adlı kategoriyi silmek istediğinizden emin misiniz?`,
                onConfirm: () => {
                  setConfirm({ open: false });
                  handleDeleteCategory(params.row.id);
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
  ];

  // --- EKRANA ÇİZDİR (RENDER) ---
  return (
    <Paper sx={{ p: 3 }}>
      {/* Yeni Kategori Ekle Formu */}
      <Typography variant="h5" component="h2" gutterBottom>
        Yeni Kategori Ekle
      </Typography>
      {message && <Typography color={message.startsWith('Hata:') ? 'error' : 'success'} gutterBottom sx={{ mb: 2 }}>{message}</Typography>}
      <Box component="form" onSubmit={handleCreateCategory} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <TextField 
          label="Kategori Adı" 
          name="name" 
          value={newCategoryName} 
          onChange={(e) => setNewCategoryName(e.target.value)} 
          required 
          size="small" 
        />
        <Button type="submit" variant="contained" color="success">Ekle</Button>
      </Box>

      <Box sx={{ my: 3, borderTop: '1px solid', borderColor: 'divider' }} />

      {/* DataGrid Tablosu */}
      <Typography variant="h5" component="h2" gutterBottom>
        Mevcut Kategoriler
      </Typography>
      <Box sx={{ height: 600, width: '100%', mt: 2 }}>
        <DataGrid
          rows={categories} 
          columns={columns} 
          pageSizeOptions={[10, 25]} 
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
        />
      </Box>

      {/* Düzenleme Dialog */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kategoriyi Düzenle</DialogTitle>
        <DialogContent>
          {editingCategoryData && (
            <Box sx={{ pt: 1 }}>
              <TextField 
                label="Kategori Adı" 
                name="name" 
                value={editingCategoryData.name} 
                onChange={handleEditModalInputChange} 
                fullWidth
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditModal(false)}>İptal</Button>
          <Button onClick={handleUpdateCategory} variant="contained" color="primary">Kaydet</Button>
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