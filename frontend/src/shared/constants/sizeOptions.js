export const SIZE_OPTIONS = [
  { key: 'small', label: 'Küçük', delta: -5.0 },
  { key: 'medium', label: 'Orta', delta: 0.0 },
  { key: 'large', label: 'Büyük', delta: 8.0 },
];

export const getSizeMeta = (sizeKey) => {
  return SIZE_OPTIONS.find((s) => s.key === sizeKey) || SIZE_OPTIONS[1]; // default medium
};

