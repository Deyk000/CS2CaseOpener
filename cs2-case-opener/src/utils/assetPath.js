const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

export function assetPath(type, fileName) {
  if (isFileProtocol) {
    return `./public/assets/images/${type}/${fileName}`;
  }

  const baseUrl = typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${baseUrl}assets/images/${type}/${fileName}`;
}