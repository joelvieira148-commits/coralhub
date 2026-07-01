// Limite de armazenamento por coral: 1 TB
export const LIMITE_STORAGE_BYTES = 1024 * 1024 * 1024 * 1024;

export function formatarBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < unidades.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${unidades[i]}`;
}

export function verificarEspaco(coral, bytesAdicionar = 0) {
  const usado = coral?.armazenamento_usado_bytes || 0;
  const limite = LIMITE_STORAGE_BYTES;
  const ok = usado + (bytesAdicionar || 0) <= limite;
  return {
    ok,
    usado,
    limite,
    percentual: limite > 0 ? Math.min((usado / limite) * 100, 100) : 0,
    restante: Math.max(limite - usado, 0),
  };
}