const IMAGE_NAME_PATTERN = /\.(apng|avif|gif|heic|heif|jpe?g|png|webp)$/i;

export const isImageFile = (file) =>
  Boolean(file) && (file.type?.startsWith('image/') || IMAGE_NAME_PATTERN.test(file.name || ''));

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel ler a imagem.'));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Nao foi possivel preparar a imagem.'));
        }
      },
      type,
      quality
    );
  });

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Nao foi possivel ler a foto.'));
    reader.readAsDataURL(file);
  });

export const compressProfilePhoto = async (
  file,
  { maxSize = 900, quality = 0.82, type = 'image/jpeg' } = {}
) => {
  if (!isImageFile(file)) {
    throw new Error('Arquivo de imagem invalido.');
  }

  const image = await loadImageFromFile(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const ratio = Math.min(1, maxSize / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas indisponivel para preparar a imagem.');
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, type, quality);
  const nextName = `${(file.name || 'foto').replace(/\.[^.]+$/, '')}.jpg`;

  if (typeof File === 'undefined') {
    blob.name = nextName;
    return blob;
  }

  return new File([blob], nextName, {
    type,
    lastModified: Date.now(),
  });
};

export const createProfilePhotoDataUrl = async (file) => {
  const tinyFile = await compressProfilePhoto(file, {
    maxSize: 280,
    quality: 0.68,
  });

  return readAsDataUrl(tinyFile);
};

export const uploadProfilePhoto = async (supabaseClient, file) => {
  if (!isImageFile(file)) {
    throw new Error('Escolha uma imagem valida para a foto.');
  }

  let preparedFile = file;

  try {
    preparedFile = await compressProfilePhoto(file);
  } catch (error) {
    console.warn('Falha ao reduzir foto antes do upload:', error);
  }

  try {
    const { file_url } = await supabaseClient.integrations.Core.UploadFile({ file: preparedFile });

    if (!file_url) {
      throw new Error('Upload sem URL de arquivo.');
    }

    return {
      url: file_url,
      size: preparedFile.size || file.size || 0,
      storedAsDataUrl: false,
    };
  } catch (uploadError) {
    console.warn('Upload da foto recusado, usando foto reduzida no cadastro:', uploadError);
    const dataUrl = await createProfilePhotoDataUrl(file);

    return {
      url: dataUrl,
      size: dataUrl.length,
      storedAsDataUrl: true,
    };
  }
};
