export const getMemberPhotoUrl = (item) =>
  item?.foto_url ||
  item?.photo_url ||
  item?.avatar_url ||
  item?.imagem_url ||
  item?.picture_url ||
  item?.foto ||
  item?.photo ||
  item?.avatar ||
  item?.picture ||
  '';

export const getMemberPhotoFields = (url) => {
  const photoUrl = url || '';

  return {
    foto_url: photoUrl,
    photo_url: photoUrl,
    avatar_url: photoUrl,
    imagem_url: photoUrl,
    picture_url: photoUrl,
  };
};

export const mergeMemberPhotoFields = (item, url) => ({
  ...item,
  ...getMemberPhotoFields(url ?? getMemberPhotoUrl(item)),
});
