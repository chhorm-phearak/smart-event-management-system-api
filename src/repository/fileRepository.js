const db = require('../config/db');
const { newId } = require('../utils/uuid');

const createFile = async ({
  filename,
  original_name,
  file_path,
  file_url,
  file_size,
  type,
  uploaded_by,
}) => {
  const fileId = newId();
  await db.query(
    `INSERT INTO files (id, filename, original_name, file_path, file_url, file_size, type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fileId,
      filename,
      original_name || null,
      file_path,
      file_url,
      file_size || 0,
      type || null,
      uploaded_by,
    ]
  );
  const result = await db.query('SELECT * FROM files WHERE id = ?', [fileId]);
  return result.rows[0];
};

module.exports = {
  createFile,
};
