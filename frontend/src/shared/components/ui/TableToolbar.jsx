import { Box, TextField } from '@mui/material';

export default function TableToolbar({ value, onChange, placeholder='Ara...' }) {
  return (
    <Box sx={{ p: 1.5, display:'flex', gap:1, alignItems:'center' }}>
      <TextField
        size="small"
        value={value}
        onChange={(e)=>onChange?.(e.target.value)}
        placeholder={placeholder}
        fullWidth
      />
    </Box>
  );
}


