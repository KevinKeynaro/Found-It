import multer from 'multer';
import itemsConfig from '../config/items.js';
import usersConfig from '../config/users.js';
import AppError from '../utils/AppError.js';

const storage = multer.memoryStorage();

const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp'];

const multerUpload = multer({
  storage,
  limits: {
    fileSize: itemsConfig.maxUploadBytes,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimetypes.includes(file.mimetype)) {
      return cb(
        new AppError(400, 'INVALID_FILE', 'Only JPEG, PNG, and WebP images are allowed.')
      );
    }
    cb(null, true);
  },
}).single('photo');

function checkMagicBytes(buffer, mimetype) {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return isJpeg;
  if (mimetype === 'image/png') return isPng;
  if (mimetype === 'image/webp') return isWebp;
  return isJpeg || isPng || isWebp;
}

export const uploadPhoto = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              413,
              'FILE_TOO_LARGE',
              `File size exceeds maximum allowed limit of ${itemsConfig.maxUploadMb}MB.`
            )
          );
        }
        return next(new AppError(400, 'INVALID_FILE', err.message));
      }
      return next(err);
    }

    if (req.file) {
      if (!checkMagicBytes(req.file.buffer, req.file.mimetype)) {
        return next(
          new AppError(
            400,
            'INVALID_FILE',
            'File contents do not match declared image format (corrupted or spoofed file).'
          )
        );
      }
    }

    next();
  });
};

const allowedCsvMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

const multerCsvUpload = multer({
  storage,
  limits: {
    fileSize: usersConfig.importMaxBytes,
  },
  fileFilter: (req, file, cb) => {
    const hasCsvExt = file.originalname && file.originalname.toLowerCase().endsWith('.csv');
    if (!hasCsvExt || !allowedCsvMimeTypes.includes(file.mimetype)) {
      return cb(
        new AppError(400, 'INVALID_FILE', 'Only CSV (.csv) files are allowed.')
      );
    }
    cb(null, true);
  },
}).single('file');

export const uploadCsv = (req, res, next) => {
  multerCsvUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              413,
              'FILE_TOO_LARGE',
              `File size exceeds maximum allowed limit of ${usersConfig.importMaxMb}MB.`
            )
          );
        }
        return next(new AppError(400, 'INVALID_FILE', err.message));
      }
      return next(err);
    }
    next();
  });
};

export default uploadPhoto;
