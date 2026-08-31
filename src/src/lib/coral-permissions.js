import { isAdminUser } from '@/lib/admin-access';
import { normalizeEmail } from '@/lib/coral-membership';

export const isCoralOwner = (user, coral) =>
  Boolean(coral?.maestro_email && normalizeEmail(user?.email) === normalizeEmail(coral.maestro_email));

export const canManageCoral = (user, coral) =>
  isAdminUser(user) || isCoralOwner(user, coral);

export const getSafeMemberRole = (user, coral, role = 'membro') => {
  const normalizedRole = role === 'maestrina' ? 'maestro' : role || 'membro';
  if (normalizedRole === 'maestro' && !isCoralOwner(user, coral)) return 'membro';
  return normalizedRole;
};
