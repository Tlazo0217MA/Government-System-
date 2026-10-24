// Reads an image file, shrinks it to at most 300 pixels, and returns a small
// JPEG data URL. Keeping photos small stops localStorage from filling up.
export function fileToSmallPhoto(file, maxSize = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('This file is not a valid image.'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
