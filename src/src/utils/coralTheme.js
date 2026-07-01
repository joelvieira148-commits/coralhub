export function applyCoralTheme(coral) {
  if (!coral) return;
  const root = document.documentElement;
  root.style.setProperty('--coral-primary', coral.cor_primaria || '#6366f1');
  root.style.setProperty('--coral-secondary', coral.cor_secundaria || '#818cf8');
}

export function getCoralStyle(coral) {
  if (!coral) return {};
  return {
    '--coral-primary': coral.cor_primaria || '#6366f1',
    '--coral-secondary': coral.cor_secundaria || '#818cf8',
  };
}

export const NAIPES = [
  { value: 'soprano1', label: 'Soprano 1', cor: '#f472b6' },
  { value: 'soprano2', label: 'Soprano 2', cor: '#fb7185' },
  { value: 'contralto', label: 'Contralto', cor: '#a78bfa' },
  { value: 'tenor', label: 'Tenor', cor: '#60a5fa' },
  { value: 'baritono', label: 'Barítono', cor: '#34d399' },
  { value: 'baixo', label: 'Baixo', cor: '#fbbf24' },
];

export const TEMAS = [
  { value: 'classico', label: 'Clássico' },
  { value: 'moderno', label: 'Moderno' },
  { value: 'eclesiastico', label: 'Eclesiástico' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'contemporaneo', label: 'Contemporâneo' },
];

export function getNaipeInfo(naipe) {
  return NAIPES.find(n => n.value === naipe) || { label: naipe, cor: '#94a3b8' };
}