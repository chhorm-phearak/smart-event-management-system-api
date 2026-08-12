-- =====================================================
-- GROUP CHAT
-- =====================================================
-- Chat messages, attached files, and read receipts for group chat

-- =====================================================
-- CHAT MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    group_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    content TEXT,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'file', 'mixed')),
    reply_to_id CHAR(36),
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_message_group
        FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id),
    CONSTRAINT fk_chat_message_reply
        FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created
    ON chat_messages(group_id, created_at DESC);

-- =====================================================
-- CHAT MESSAGE FILES
-- =====================================================
-- Each chat message can have multiple attached files (max 5 enforced at app level)
CREATE TABLE IF NOT EXISTS chat_message_files (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    message_id CHAR(36) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INT,
    file_type VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_file_message
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_message_files_message_id
    ON chat_message_files(message_id);

-- =====================================================
-- CHAT MESSAGE READ RECEIPTS
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_message_reads (
    id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
    message_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_read_message
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_read_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_chat_read UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message_id
    ON chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_id
    ON chat_message_reads(user_id);
