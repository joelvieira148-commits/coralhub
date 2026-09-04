export const NOME_CORAL_FONTES = [
  {
    value: 'classica',
    label: 'Clássica',
    style: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontStyle: 'italic' },
  },
  {
    value: 'elegante',
    label: 'Elegante',
    style: { fontFamily: '"Cormorant Garamond", Garamond, Georgia, serif', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'majestosa',
    label: 'Majestosa',
    style: { fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'assinatura',
    label: 'Assinatura',
    style: { fontFamily: '"Great Vibes", "Brush Script MT", cursive', fontWeight: 400, fontStyle: 'normal' },
  },
  {
    value: 'romantica',
    label: 'Romântica',
    style: { fontFamily: '"Parisienne", "Brush Script MT", cursive', fontWeight: 400, fontStyle: 'normal' },
  },
  {
    value: 'manuscrita',
    label: 'Manuscrita',
    style: { fontFamily: '"Dancing Script", "Lucida Handwriting", cursive', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'serena',
    label: 'Serena',
    style: { fontFamily: '"Marcellus", Georgia, serif', fontWeight: 400, fontStyle: 'normal' },
  },
  {
    value: 'moderna',
    label: 'Moderna',
    style: { fontFamily: '"Montserrat", Arial, sans-serif', fontWeight: 800, fontStyle: 'normal' },
  },
  {
    value: 'leve',
    label: 'Leve',
    style: { fontFamily: '"Quicksand", Arial, sans-serif', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'forte',
    label: 'Forte',
    style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontWeight: 700, fontStyle: 'normal' },
  },
  {
    value: 'suave',
    label: 'Suave',
    style: { fontFamily: '"Segoe UI", Arial, sans-serif', fontWeight: 600, fontStyle: 'normal' },
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
