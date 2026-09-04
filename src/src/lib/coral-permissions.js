import { isAdminUser } from '@/lib/admin-access';
import { normalizeEmail } from '@/lib/coral-membership';

export const isCoralOwner = (user, coral) =>
  Boolean(coral?.maestro_email && normalizeEmail(user?.email) === normalizeEmail(coral.maestro_email));

export const isRegenteRole = (role) => role === 'maestro' || role === 'maestrina';

export const getCoralManagerEmails = (coral) => {
  const values = [
    coral?.maestro_email,
    ...(Array.isArray(coral?.maestro_emails) ? coral.maestro_emails : []),
    ...(Array.isArray(coral?.regente_emails) ? coral.regente_emails : []),
  ];

  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
};

export const isCoralManager = (user, coral) => {
  const email = normalizeEmail(user?.email);
  return Boolean(email && getCoralManagerEmails(coral).includes(email));
};

export const canManageCoral = (user, coral) =>
  isAdminUser(user) || isCoralManager(user, coral);

export const getSafeMemberRole = (user, coral, role = 'membro') => {
  const normalizedRole = isRegenteRole(role) ? 'maestro' : role || 'membro';
  if (normalizedRole === 'maestro' && !isCoralManager(user, coral)) return 'membro';
  return normalizedRole;
};
