import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EMPTY_NUTRITION, hasMeaningfulNutrition } from '../utils/productNutrition.js';

export default function ProductFormDialog({
  open,
  mode = 'create',
  initialData,
  categories = [],
  submitting = false,
  onClose,
  onSubmit,
  onAiEstimate,
  aiEstimateLoading = false,
  aiEstimateInfo = '',
  aiEstimateError = '',
}) {
  const [formData, setFormData] = useState(null);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    setFormData(
      initialData
        ? {
            ...initialData,
            nutrition: { ...EMPTY_NUTRITION, ...initialData.nutrition },
          }
        : null
    );
    setNutritionExpanded(false);
    setValidationError('');
  }, [open, initialData]);

  useEffect(() => {
    if (aiEstimateInfo || aiEstimateError) {
      setNutritionExpanded(true);
    }
  }, [aiEstimateInfo, aiEstimateError]);

  if (!formData) return null;

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNutritionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const showNutrition = Boolean(formData.nutrition?.isNutritionVisibleToCustomer);
    const hasCalories = Number(formData.nutrition?.calories) > 0;
    if (showNutrition && !hasCalories) {
      setValidationError(
        'Müşteriye besin bilgisi göstermek için en az kalori (kcal) değeri girmelisiniz.'
      );
      setNutritionExpanded(true);
      return;
    }

    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Temel Bilgiler
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Ürün Adı"
                name="name"
                value={formData.name}
                onChange={handleFieldChange}
                required
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fiyat (TL)"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleFieldChange}
                required
                fullWidth
                size="small"
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Stok Adedi"
                name="countInStock"
                type="number"
                value={formData.countInStock}
                onChange={handleFieldChange}
                required
                fullWidth
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Kategori</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  label="Kategori"
                  onChange={handleFieldChange}
                >
                  {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Görsel URL"
                name="imageUrl"
                value={formData.imageUrl || ''}
                onChange={handleFieldChange}
                required
                fullWidth
                size="small"
                placeholder="https://..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Açıklama"
                name="description"
                value={formData.description || ''}
                onChange={handleFieldChange}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isVisibleToCustomer !== false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isVisibleToCustomer: e.target.checked,
                      }))
                    }
                  />
                }
                label="Ürünü menüde göster"
              />
            </Grid>
          </Grid>

          {onAiEstimate ? (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => onAiEstimate(formData)}
                disabled={aiEstimateLoading || !String(formData.name || '').trim()}
                startIcon={
                  aiEstimateLoading ? <CircularProgress size={16} color="inherit" /> : null
                }
              >
                {aiEstimateLoading ? 'Hesaplanıyor...' : 'AI ile Kalori Hesapla'}
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.75 }}>
                {isEdit
                  ? 'AI tahmini besin alanlarına yazılır. Sonucu kontrol edip kaydedin.'
                  : 'Ürün adını girdikten sonra AI tahmini alabilirsiniz. Kaydettiğinizde taslak olarak saklanır.'}
              </Typography>
            </Box>
          ) : null}

          {aiEstimateError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {aiEstimateError}
            </Alert>
          ) : null}
          {aiEstimateInfo ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {aiEstimateInfo}
            </Alert>
          ) : null}

          <Accordion
            expanded={nutritionExpanded}
            onChange={(_, exp) => setNutritionExpanded(exp)}
            disableGutters
            elevation={0}
            sx={{
              mt: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography variant="subtitle2">Besin Değerleri (isteğe bağlı)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Müşteri menüsünde kalori göstermek için doldurup onaylayın
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {validationError ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {validationError}
                </Alert>
              ) : null}

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Kalori (kcal)"
                    name="calories"
                    type="number"
                    value={formData.nutrition.calories}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Protein (g)"
                    name="protein"
                    type="number"
                    value={formData.nutrition.protein}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Karbonhidrat (g)"
                    name="carbs"
                    type="number"
                    value={formData.nutrition.carbs}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Yağ (g)"
                    name="fat"
                    type="number"
                    value={formData.nutrition.fat}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Porsiyon (g)"
                    name="servingGram"
                    type="number"
                    value={formData.nutrition.servingGram}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Porsiyon Birimi"
                    name="portionUnit"
                    value={formData.nutrition.portionUnit}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    placeholder="örn: adet, porsiyon"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="İçerikler (virgülle)"
                    name="ingredients"
                    value={formData.nutrition.ingredients}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    placeholder="tavuk, marul, sos"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Alerjenler (virgülle)"
                    name="allergens"
                    value={formData.nutrition.allergens}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                    placeholder="gluten, süt"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Besin Notu"
                    name="nutritionNote"
                    value={formData.nutrition.nutritionNote}
                    onChange={handleNutritionChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="isNutritionVisibleToCustomer"
                        checked={Boolean(formData.nutrition.isNutritionVisibleToCustomer)}
                        onChange={handleNutritionChange}
                      />
                    }
                    label="Besin değerini müşteriye göster"
                  />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 6 }}>
                    Açıp kaydettiğinizde besin bilgisi müşteri menüsünde görünür.
                  </Typography>
                </Grid>
              </Grid>

              {hasMeaningfulNutrition(formData.nutrition) &&
              !formData.nutrition.isNutritionVisibleToCustomer ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Besin bilgisi kayıtlı ancak müşteriye henüz gösterilmiyor.
                </Typography>
              ) : null}
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            İptal
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={submitting}>
            {submitting ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Ekle'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function createEmptyProductForm(defaultCategoryId = '') {
  return {
    name: '',
    price: '',
    description: '',
    category: defaultCategoryId,
    countInStock: 0,
    imageUrl: '',
    isVisibleToCustomer: true,
    nutritionStatus: 'none',
    nutrition: { ...EMPTY_NUTRITION },
  };
}
