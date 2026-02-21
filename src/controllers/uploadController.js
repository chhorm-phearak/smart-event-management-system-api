const { uploadSingleFile, uploadMultipleFiles } = require('../services/uploadService');
const { createFile } = require('../repository/fileRepository');

/**
 * Handle single file upload.
 * Expects multer middleware with .single('file') to run before this.
 */
const uploadSingle = async (req, res) => {
  try {
    const result = uploadSingleFile(req.file);
    if (!result) {
      return res.status(400).json({
        message: 'No file uploaded. Use field name "file".',
      });
    }

    const savedFile = await createFile({
      filename: result.filename,
      original_name: result.originalName,
      file_path: result.path,
      file_url: result.url,
      file_size: result.size,
      type: result.mimetype,
      uploaded_by: req.user.id,
    });

    return res.status(201).json({
      message: 'File uploaded successfully',
      data: { file: savedFile },
    });
  } catch (err) {
    console.error('Upload single file error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Handle multiple files upload.
 * Expects multer middleware with .array('files', n) to run before this.
 */
const uploadMultiple = async (req, res) => {
  try {
    const files = uploadMultipleFiles(req.files);
    if (files.length === 0) {
      return res.status(400).json({
        message: 'No files uploaded. Use field name "files".',
      });
    }

    const savedFiles = await Promise.all(
      files.map((file) =>
        createFile({
          filename: file.filename,
          original_name: file.originalName,
          file_path: file.path,
          file_url: file.url,
          file_size: file.size,
          type: file.mimetype,
          uploaded_by: req.user.id,
        })
      )
    );

    return res.status(201).json({
      message: 'Files uploaded successfully',
      data: { files: savedFiles, count: savedFiles.length },
    });
  } catch (err) {
    console.error('Upload multiple files error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
};
