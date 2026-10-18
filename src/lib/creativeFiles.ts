export async function prepareImageDataUrl(
  file: File,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  maxDimension = 1024,
): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  }
  if (file.size > 12 * 1024 * 1024) throw new Error('Image must be smaller than 12 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot prepare the image.');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not prepare this image.')), format, 0.84);
    });
    if (blob.size > 4 * 1024 * 1024) throw new Error('Prepared image is too large. Try a smaller or simpler image.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the image.'));
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
