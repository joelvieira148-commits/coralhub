export const NOME_CORAL_FONTES = [
  {
    value: 'classica',
    label: 'Classica',
    style: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontStyle: 'italic' },
  },
  {
    value: 'elegante',
    label: 'Elegante',
    style: { fontFamily: 'Garamond, Georgia, serif', fontWeight: 600, fontStyle: 'normal' },
  },
  {
    value: 'moderna',
    label: 'Moderna',
    style: { fontFamily: '"Trebuchet MS", Arial, sans-serif', fontWeight: 800, fontStyle: 'normal' },
  },
  {
    value: 'forte',
    label: 'Forte',
    style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'suave',
    label: 'Suave',
    style: { fontFamily: '"Segoe UI", Arial, sans-serif', fontWeight: 500, fontStyle: 'normal' },
  },
  {
    value: 'manuscrita',
    label: 'Manuscrita',
    style: { fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive', fontWeight: 500, fontStyle: 'normal' },
  },
  {
    value: 'serena',
    label: 'Serena',
    style: { fontFamily: '"Palatino Linotype", Palatino, serif', fontWeight: 600, fontStyle: 'italic' },
  },
  {
    value: 'formal',
    label: 'Formal',
    style: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 700, fontStyle: 'normal' },
  },
];

export const getNomeCoralFonte = (value) =>
  NOME_CORAL_FONTES.find((font) => font.value === value) || NOME_CORAL_FONTES[0];

export const getNomeCoralFonteStyle = (value) => getNomeCoralFonte(value).style;
