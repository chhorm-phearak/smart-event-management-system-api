const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsBase = path.join(process.cwd(), 'uploads');
const eventsDir = path.join(uploadsBase, 'events');
const filesDir = path.join(uploadsBase, 'files');

[eventsDir, filesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const createStorage = (destinationDir) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destinationDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error('Only jpeg, png, and webp image uploads are allowed'));
  }
  cb(null, true);
};

const limits = { fileSize: 5 * 1024 * 1024 };

const uploadEventImages = multer({
  storage: createStorage(eventsDir),
  fileFilter,
  limits,
});

const uploadSingle = multer({
  storage: createStorage(filesDir),
  fileFilter,
  limits,
}).single('file');

const uploadMultiple = multer({
  storage: createStorage(filesDir),
  fileFilter,
  limits,
}).array('files', 10);

module.exports = {
  uploadEventImages,
  uploadSingle,
  uploadMultiple,
};
