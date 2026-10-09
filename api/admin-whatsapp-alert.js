const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const eventLabels = {
  admin_login_success: 'Entrada no Admin confirmada',
  admin_login_failed: 'Tentativa de entrada no Admin recusada',
  admin_password_change_started: 'Tentativa de troca da senha do Admin',
  admin_password_change_success: 'Senha do Admin trocada',
  admin_password_change_failed: 'Troca da senha do Admin recusada',
};

const clean = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeWhatsAppNumber = (value = '') => {
  const raw = clean(value);
  if (!raw) return '';
  return raw.startsWith('whatsapp:') ? raw : `whatsapp:${raw}`;
};

const buildMessage = (payload = {}, req) => {
  const eventLabel = eventLabels[payload.event] || 'Aviso de seguranca do Admin';
  const email = clean(payload.email) || 'E-mail nao informado';
  const status = payload.success === true ? 'permitido' : payload.success === false ? 'bloqueado' : 'registrado';
  const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });
  const ip = clean(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0] || 'nao identificado';
  const page = clean(payload.page);
  const device = clean(payload.device);

  return [
    'CoralHub - aviso do Admin',
    `Evento: ${eventLabel}`,
    `Status: ${status}`,
    `E-mail: ${email}`,
    `Data: ${when}`,
    `IP: ${ip}`,
    page ? `Tela: ${page}` : '',
    device ? `Dispositivo: ${device.slice(0, 180)}` : '',
  ].filter(Boolean).join('\n');
};

const sendTwilioWhatsApp = async (message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = normalizeWhatsAppNumber(process.env.TWILIO_WHATSAPP_FROM);
  const to = normalizeWhatsAppNumber(process.env.ADMIN_WHATSAPP_TO);

  if (!accountSid || !authToken || !from || !to) {
    return false;
  }

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: message,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Twilio retornou ${response.status}`);
  }

  return true;
};

const sendMetaWhatsApp = async (message) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = clean(process.env.ADMIN_WHATSAPP_TO).replace(/[^\d]/g, '');
  const graphVersion = clean(process.env.WHATSAPP_GRAPH_VERSION) || 'v26.0';

  if (!token || !phoneNumberId || !to) {
    return false;
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API retornou ${response.status}`);
  }

  return true;
};

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido.' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const message = buildMessage(payload, req);
    const sent = await sendTwilioWhatsApp(message) || await sendMetaWhatsApp(message);

    res.status(200).json({
      ok: true,
      sent,
      configured: sent,
    });
  } catch (error) {
    console.error('Falha ao enviar aviso do Admin:', error);
    res.status(200).json({
      ok: false,
      sent: false,
      error: 'Nao foi possivel enviar o aviso agora.',
    });
  }
}
