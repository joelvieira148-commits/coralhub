export const clearCoralMembershipFields = {
  active_coral_id: '',
  active_coral_role: '',
  active_coral_nome: '',
  active_coral_cidade: '',
  active_member_id: '',
  member_nome: '',
  member_naipe: '',
  member_foto_url: '',
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const getMemberEmail = (member) => normalizeEmail(member?.user_email || member?.email);

export const hasCoralMembershipData = (user) =>
  Boolean(
    user?.active_coral_id ||
      user?.active_coral_role ||
      user?.active_member_id ||
      user?.member_nome ||
      user?.member_naipe ||
      user?.member_foto_url
  );

export const clearCurrentUserCoralMembership = async (supabaseClient, user) => {
  const clearedUser = {
    ...user,
    ...clearCoralMembershipFields,
  };

  if (!hasCoralMembershipData(user)) {
    return clearedUser;
  }

  try {
    return await supabaseClient.auth.updateMe(clearCoralMembershipFields);
  } catch (error) {
    console.warn('Falha ao limpar vinculo do coral no perfil do usuario:', error);
    return clearedUser;
  }
};

const shouldUpdate = (user, fields) =>
  Object.entries(fields).some(([key, value]) => String(user?.[key] || '') !== String(value || ''));

export const syncCurrentUserCoralMembership = async (supabaseClient, user, fields) => {
  const cleanFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value || ''])
  );
  const syncedUser = {
    ...user,
    ...cleanFields,
  };

  if (!shouldUpdate(user, cleanFields)) {
    return syncedUser;
  }

  try {
    return await supabaseClient.auth.updateMe(cleanFields);
  } catch (error) {
    console.warn('Falha ao sincronizar vinculo do coral no perfil do usuario:', error);
    return syncedUser;
  }
};
