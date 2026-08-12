-- =====================================================
-- FILES (store uploaded file metadata)
-- =====================================================
CREATE TABLE IF NOT EXISTS files (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    type VARCHAR(100),
    uploaded_by CHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Index for faster lookups by uploader
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Index for lookups by created_at (e.g. list recent uploads)
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
