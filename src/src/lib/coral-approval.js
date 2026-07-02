const APPROVED = 'aprovado';
const PENDING = 'pendente';

export const CORAL_STATUS = {
  approved: APPROVED,
  pending: PENDING,
};

export const createApprovalCode = () => {
  const now = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(2, 6);
  return `CORAL-${now}-${random}`;
};

export const isCoralPending = (coral) =>
  String(coral?.status_aprovacao || '').toLowerCase() === PENDING;

export const isCoralApproved = (coral) => {
  const status = String(coral?.status_aprovacao || '').toLowerCase();
  return !status || status === APPROVED;
};

export const getApprovalFields = (adminEmail = '') => ({
  status_aprovacao: APPROVED,
  aprovado_em: new Date().toISOString(),
  aprovado_por: adminEmail,
});
