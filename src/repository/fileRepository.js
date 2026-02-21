const db = require('../config/db');

const createFile = async ({
  filename,
  original_name,
  file_path,
  file_url,
  file_size,
  type,
  uploaded_by,
}) => {
  const result = await db.query(
    `INSERT INTO files (filename, original_name, file_path, file_url, file_size, type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      filename,
      original_name || null,
      file_path,
      file_url,
      file_size || 0,
      type || null,
      uploaded_by,
    ]
  );
  return result.rows[0];
};

module.exports = {
  createFile,
};
