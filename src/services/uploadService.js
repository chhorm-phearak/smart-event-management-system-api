const path = require('path');

const getPublicUrl = (filePath) => {
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex === -1) return `/uploads/files/${path.basename(filePath)}`;
  return normalized.slice(normalized.indexOf('/uploads/'));
};

/**
 * Build response for a single uploaded file (from multer req.file).
 * @param {Express.Multer.File} file - req.file from multer
 * @returns {{ filename: string, path: string, url: string, size: number, mimetype: string } | null}
 */
const uploadSingleFile = (file) => {
  if (!file || !file.path) return null;
  return {
    filename: file.filename,
    originalName: file.originalname,
    path: file.path,
    url: getPublicUrl(file.path),
    size: file.size,
    mimetype: file.mimetype,
  };
};

/**
 * Build response for multiple uploaded files (from multer req.files).
 * @param {Express.Multer.File[]} files - req.files from multer
 * @returns {Array<{ filename: string, path: string, url: string, size: number, mimetype: string }>}
 */
const uploadMultipleFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  return files.map((file) => uploadSingleFile(file)).filter(Boolean);
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  getPublicUrl,
};
