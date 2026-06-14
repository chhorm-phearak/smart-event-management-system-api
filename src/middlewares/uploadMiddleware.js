const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsBase = path.join(process.cwd(), 'uploads');
const eventsDir = path.join(uploadsBase, 'events');
const filesDir = path.join(uploadsBase, 'files');
const chatDir = path.join(uploadsBase, 'chat');

[eventsDir, filesDir, chatDir].forEach((dir) => {
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

// ===== CHAT UPLOADS =====
// Allow images and common document types for chat attachments
const chatAllowedMimeTypes = new Set([
  // images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // archives
  'application/zip',
  'application/x-zip-compressed',
]);

const chatFileFilter = (_req, file, cb) => {
  if (!chatAllowedMimeTypes.has(file.mimetype)) {
    return cb(new Error('Unsupported chat file type. Allowed: images, PDF, Office docs, txt, csv, zip'));
  }
  cb(null, true);
};

// Max 5 files per message, each up to 10MB
const chatLimits = { fileSize: 10 * 1024 * 1024 };

const uploadChatFiles = multer({
  storage: createStorage(chatDir),
  fileFilter: chatFileFilter,
  limits: chatLimits,
}).array('files', 5);

module.exports = {
  uploadEventImages,
  uploadSingle,
  uploadMultiple,
  uploadChatFiles,
};
