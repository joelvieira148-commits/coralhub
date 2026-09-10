const normalizeHexColor = (color) => {
  const value = String(color || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return '#ffffff';
};

const getRgbFromHex = (color) => {
  const hex = normalizeHexColor(color).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

export const isLightTextColor = (color) => {
  const { r, g, b } = getRgbFromHex(color);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

export const getReadableTextShadow = (color) =>
  isLightTextColor(color)
    ? '0 2px 6px rgba(0, 0, 0, 0.92), 0 0 18px rgba(0, 0, 0, 0.74)'
    : '0 1px 4px rgba(255, 255, 255, 0.92), 0 0 16px rgba(255, 255, 255, 0.72)';

export const getReadableTextStyle = (color) => ({
  color: normalizeHexColor(color),
  textShadow: getReadableTextShadow(color),
});
