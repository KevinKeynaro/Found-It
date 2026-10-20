import cloudinary from '../config/cloudinary.js';

export function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'found-it/items',
        transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete Cloudinary image "${publicId}":`, err.message || err);
  }
}

export function thumbnailUrl(publicId) {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    transformation: [
      { width: 400, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
    ],
    secure: true,
  });
}

export default {
  uploadImage,
  deleteImage,
  thumbnailUrl,
};
