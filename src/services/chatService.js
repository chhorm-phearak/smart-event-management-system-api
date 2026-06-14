const { findGroupById, isGroupMember } = require('../repository/groupRepository');
const { isOrganizationOwner } = require('../repository/organizationRepository');
const { getFullUrl } = require('./uploadService');

/**
 * Verify the user has access to the given group's chat.
 * Access = group member OR owner of the parent organization OR admin.
 * Throws an Error with `.status` set to 403/404.
 */
const ensureGroupChatAccess = async (groupId, userId, userRole) => {
  const group = await findGroupById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  if (userRole === 'admin_role') return group;

  const [member, owner] = await Promise.all([
    isGroupMember(groupId, userId),
    isOrganizationOwner(group.organization_id, userId),
  ]);

  if (!member && !owner) {
    const err = new Error('You do not have access to this group chat');
    err.status = 403;
    throw err;
  }
  return group;
};

/**
 * Format a single chat_messages row (with sender_* columns and `files`) into API shape.
 */
const formatMessage = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    group_id: row.group_id,
    content: row.content,
    message_type: row.message_type,
    reply_to_id: row.reply_to_id,
    is_edited: row.is_edited,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sender: {
      id: row.sender_id,
      first_name: row.sender_first_name,
      last_name: row.sender_last_name,
      email: row.sender_email,
      img_url: row.sender_img_url ? getFullUrl(row.sender_img_url) : null,
    },
    files: (row.files || []).map((f) => ({
      id: f.id,
      file_url: getFullUrl(f.file_url),
      file_name: f.file_name,
      file_size: f.file_size,
      file_type: f.file_type,
    })),
    // Read receipts: who has read this message and when
    read_count: (row.reads || []).length,
    read_by: (row.reads || []).map((r) => ({
      user_id: r.user_id,
      read_at: r.read_at,
    })),
  };
};

/**
 * Verify the user has access to global chat.
 * All authenticated users can access global chat.
 */
const ensureGlobalChatAccess = async (userId) => {
  // All authenticated users can access global chat
  // No additional checks needed
  return true;
};

module.exports = {
  ensureGroupChatAccess,
  ensureGlobalChatAccess,
  formatMessage,
};
