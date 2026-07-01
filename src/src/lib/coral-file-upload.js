import { compressProfilePhoto } from '@/lib/profile-photo-upload';

const KIND_RULES = {
  audio: {
    label: 'audio',
    mime: /^audio\//i,
    extension: /\.(aac|flac|m4a|mp3|ogg|opus|wav|weba|wma)$/i,
    defaultExtension: '.mp3',
    defaultType: 'audio/mpeg',
  },
  image: {
    label: 'imagem',
    mime: /^image\//i,
    extension: /\.(apng|avif|gif|heic|heif|jpe?g|png|webp)$/i,
    defaultExtension: '.jpg',
    defaultType: 'image/jpeg',
  },
  pdf: {
    label: 'PDF',
    mime: /^application\/pdf$/i,
    extension: /\.pdf$/i,
    defaultExtension: '.pdf',
    defaultType: 'application/pdf',
  },
  video: {
    label: 'video',
    mime: /^video\//i,
    extension: /\.(3gp|m4v|mkv|mov|mp4|mpeg|ogv|webm)$/i,
    defaultExtension: '.mp4',
    defaultType: 'video/mp4',
  },
};

const UNKNOWN_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
]);

const hasKnownExtension = (name = '') =>
  /\.(aac|apng|avif|flac|gif|heic|heif|jpe?g|m4a|m4v|mkv|mov|mp3|mp4|mpeg|ogg|ogv|opus|pdf|png|wav|weba|webm|webp|wma)$/i.test(name);

export const isFileKind = (file, kind) => {
  const rule = KIND_RULES[kind];
  if (!rule || !file) return false;

  const type = String(file.type || '').toLowerCase();
  const name = file.name || '';

  if (rule.mime.test(type) || rule.extension.test(name)) return true;

  // Android/Capacitor can return a File with no useful MIME or extension even
  // when it came from an accept-filtered picker. Let the upload normalize it.
  return UNKNOWN_MIME_TYPES.has(type) && !hasKnownExtension(name);
};

export const assertFileKind = (file, kind) => {
  if (!isFileKind(file, kind)) {
    throw new Error(`Selecione um arquivo de ${KIND_RULES[kind]?.label || 'midia'} valido.`);
  }
};

export const uploadCoralFile = async (firebaseClient, file, { kind } = {}) => {
  if (!file) {
    throw new Error('Escolha um arquivo para enviar.');
  }

  if (kind) {
    assertFileKind(file, kind);
  }

  const uploadFile = kind === 'image'
    ? await prepareImageForCloud(file)
    : normalizeUploadFile(file, kind);
  const upload = await firebaseClient.integrations.Core.UploadFile({ file: uploadFile });
  const file_url = upload?.file_url;

  if (!file_url) {
    throw new Error('O envio para a nuvem terminou sem gerar URL do arquivo.');
  }

  return {
    file_url,
    file_name: uploadFile.name || file.name || 'arquivo',
    file_size: uploadFile.size || file.size || 0,
    file_type: uploadFile.type || file.type || '',
    stored_as_data_url: false,
  };
};

const prepareImageForCloud = async (file) => {
  try {
    const compressed = await compressProfilePhoto(file, {
      maxSize: 1600,
      quality: 0.86,
    });
    return normalizeUploadFile(compressed, 'image');
  } catch (error) {
    console.warn('Falha ao reduzir imagem antes do upload:', error);
    return normalizeUploadFile(file, 'image');
  }
};

const normalizeUploadFile = (file, kind) => {
  const rule = KIND_RULES[kind];
  if (!rule || typeof File === 'undefined') return file;

  const type = String(file.type || '').toLowerCase();
  const needsType = UNKNOWN_MIME_TYPES.has(type);
  const needsName = !rule.extension.test(file.name || '');

  if (!needsType && !needsName) return file;

  const baseName = (file.name || rule.label || 'arquivo').replace(/\.[^.]+$/, '') || 'arquivo';
  const name = needsName ? `${baseName}${rule.defaultExtension}` : file.name;

  return new File([file], name, {
    type: needsType ? rule.defaultType : file.type,
    lastModified: file.lastModified || Date.now(),
  });
};

export const getUploadErrorMessage = (error, label = 'arquivo') =>
  error?.message && error.message.startsWith('Selecione ')
    ? error.message
    : `Nao foi possivel enviar ${label} para a nuvem. Verifique a internet e tente novamente.`;
