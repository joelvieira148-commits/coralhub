const ADMIN_ALERT_ENDPOINT = '/api/admin-whatsapp-alert';

export const notifyAdminSecurityEvent = async ({ event, user, success, page } = {}) => {
  if (typeof window === 'undefined') return;

  try {
    await fetch(ADMIN_ALERT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        success,
        email: user?.email || '',
        page: page || window.location.pathname,
        device: window.navigator?.userAgent || '',
      }),
    });
  } catch (error) {
    console.warn('Falha ao enviar aviso de seguranca do admin:', error);
  }
};
