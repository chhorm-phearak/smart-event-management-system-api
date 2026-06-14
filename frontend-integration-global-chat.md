# Global Chat Frontend Integration Guide

## Overview
This guide provides complete frontend integration for the global chat feature, including API calls, socket connection, and real-time updates.

## Base URL Configuration
```javascript
const API_BASE_URL = 'http://localhost:3000'; // Update to your API URL
const SOCKET_URL = 'http://localhost:3000';   // Update to your socket URL
```

## Authentication
All API calls require JWT Bearer token:
```javascript
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});
```

## Socket.IO Integration

### 1. Install Socket.IO Client
```bash
npm install socket.io-client
```

### 2. Socket Connection and Global Chat Setup
```javascript
import io from 'socket.io-client';

class GlobalChatService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.globalMessages = [];
    this.unreadCount = 0;
    this.callbacks = {};
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket && this.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
      // Join global chat room
      this.socket.emit('join:group', 'global');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    // Listen for new global messages
    this.socket.on('chat:new_message', (message) => {
      console.log('New global message:', message);
      this.globalMessages.unshift(message);
      this.unreadCount++;
      
      // Trigger callbacks
      if (this.callbacks.onNewMessage) {
        this.callbacks.onNewMessage(message);
      }
      if (this.callbacks.onUnreadCountChange) {
        this.callbacks.onUnreadCountChange(this.unreadCount);
      }
    });

    // Listen for global read receipts
    this.socket.on('chat:global_read', (data) => {
      console.log('Global messages read:', data);
      
      // Update read status for messages
      data.message_ids.forEach(msgId => {
        const message = this.globalMessages.find(m => m.id === msgId);
        if (message && !message.read_by) {
          message.read_by = [];
        }
        if (message && !message.read_by.some(r => r.user_id === data.user_id)) {
          message.read_by.push({
            user_id: data.user_id,
            read_at: data.read_at
          });
        }
      });

      // Trigger callbacks
      if (this.callbacks.onMessagesRead) {
        this.callbacks.onMessagesRead(data);
      }
    });

    // Listen for message edits
    this.socket.on('chat:message_edited', (data) => {
      const message = this.globalMessages.find(m => m.id === data.message_id);
      if (message) {
        message.content = data.content;
        message.is_edited = true;
        message.updated_at = data.updated_at;
        
        if (this.callbacks.onMessageEdited) {
          this.callbacks.onMessageEdited(data);
        }
      }
    });

    // Listen for message deletions
    this.socket.on('chat:message_deleted', (data) => {
      const index = this.globalMessages.findIndex(m => m.id === data.message_id);
      if (index !== -1) {
        this.globalMessages.splice(index, 1);
        
        if (this.callbacks.onMessageDeleted) {
          this.callbacks.onMessageDeleted(data);
        }
      }
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Set event callbacks
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // Send message to global chat
  async sendMessage(content, files = []) {
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      // Add files if any
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/global-chat/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const message = await response.json();
      return message;
    } catch (error) {
      console.error('Error sending global message:', error);
      throw error;
    }
  }

  // Get global messages with pagination
  async getMessages(limit = 20, before = null) {
    try {
      let url = `${API_BASE_URL}/api/global-chat/messages?limit=${limit}`;
      if (before) {
        url += `&before=${before}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Append to existing messages (for pagination)
      if (before) {
        this.globalMessages.push(...data.data);
      } else {
        this.globalMessages = data.data;
      }

      return data;
    } catch (error) {
      console.error('Error getting global messages:', error);
      throw error;
    }
  }

  // Mark all global messages as read
  async markAllRead() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/global-chat/read-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.unreadCount = 0;
      
      // Trigger callback
      if (this.callbacks.onUnreadCountChange) {
        this.callbacks.onUnreadCountChange(0);
      }

      return data;
    } catch (error) {
      console.error('Error marking global messages as read:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/global-chat/unread-count`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.unreadCount = data.data.unread_count;
      
      // Trigger callback
      if (this.callbacks.onUnreadCountChange) {
        this.callbacks.onUnreadCountChange(this.unreadCount);
      }

      return data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Search global messages
  async searchMessages(query, limit = 50) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/global-chat/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching global messages:', error);
      throw error;
    }
  }

  // Edit a message
  async editMessage(messageId, newContent) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/global-chat/messages/${messageId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const message = await response.json();
      
      // Update local message
      const localMessage = this.globalMessages.find(m => m.id === messageId);
      if (localMessage) {
        localMessage.content = message.content;
        localMessage.is_edited = true;
        localMessage.updated_at = message.updated_at;
      }

      return message;
    } catch (error) {
      console.error('Error editing global message:', error);
      throw error;
    }
  }

  // Delete a message
  async deleteMessage(messageId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/global-chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove from local messages
      const index = this.globalMessages.findIndex(m => m.id === messageId);
      if (index !== -1) {
        this.globalMessages.splice(index, 1);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting global message:', error);
      throw error;
    }
  }
}

// Create singleton instance
const globalChatService = new GlobalChatService();

export default globalChatService;
```

## React Component Example

### 1. Global Chat Component
```jsx
import React, { useState, useEffect, useRef } from 'react';
import globalChatService from './globalChatService';

const GlobalChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('token');
    globalChatService.connect(token);

    // Set up callbacks
    globalChatService.on('onNewMessage', (message) => {
      setMessages(prev => [message, ...prev]);
    });

    globalChatService.on('onUnreadCountChange', (count) => {
      setUnreadCount(count);
    });

    globalChatService.on('onMessagesRead', (data) => {
      // Update UI to show read receipts
      setMessages(prev => prev.map(msg => {
        if (data.message_ids.includes(msg.id)) {
          return {
            ...msg,
            read_by: [...(msg.read_by || []), {
              user_id: data.user_id,
              read_at: data.read_at
            }]
          };
        }
        return msg;
      }));
    });

    // Load initial messages
    loadMessages();

    // Get unread count
    globalChatService.getUnreadCount();

    return () => {
      globalChatService.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await globalChatService.getMessages();
      setMessages(data.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (messages.length === 0) return;
    
    try {
      const lastMessage = messages[messages.length - 1];
      const data = await globalChatService.getMessages(20, lastMessage.id);
      setMessages(prev => [...prev, ...data.data]);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await globalChatService.sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await globalChatService.markAllRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) {
      setShowSearch(false);
      return;
    }

    try {
      const data = await globalChatService.searchMessages(searchQuery.trim());
      setSearchResults(data.data);
      setShowSearch(true);
    } catch (error) {
      console.error('Failed to search messages:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      await globalChatService.sendMessage(newMessage.trim(), files);
      setNewMessage('');
      event.target.value = ''; // Clear file input
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="global-chat-container">
      <div className="chat-header">
        <h2>Global Chat</h2>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="mark-read-btn">
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="chat-search">
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
        />
        <button onClick={searchMessages}>Search</button>
        {showSearch && (
          <button onClick={() => setShowSearch(false)}>Clear</button>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        {loading ? (
          <div>Loading messages...</div>
        ) : showSearch ? (
          <div className="search-results">
            <h3>Search Results</h3>
            {searchResults.map(message => (
              <div key={message.id} className="message">
                <strong>{message.sender.first_name} {message.sender.last_name}</strong>
                <p>{message.content}</p>
                <small>{formatTime(message.created_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="messages-list">
              {messages.map(message => (
                <div key={message.id} className="message">
                  <div className="message-header">
                    <strong>{message.sender.first_name} {message.sender.last_name}</strong>
                    <small>{formatTime(message.created_at)}</small>
                    {message.is_edited && <span className="edited">(edited)</span>}
                  </div>
                  <p>{message.content}</p>
                  
                  {/* Files */}
                  {message.files && message.files.length > 0 && (
                    <div className="message-files">
                      {message.files.map(file => (
                        <a key={file.id} href={file.file_url} target="_blank" rel="noopener noreferrer">
                          {file.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Read receipts */}
                  {message.read_by && message.read_by.length > 0 && (
                    <div className="read-receipts">
                      Read by {message.read_by.length} people
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Load more button */}
            <button onClick={loadMoreMessages} className="load-more-btn">
              Load More Messages
            </button>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="message-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type your message..."
          rows={3}
        />
        <div className="input-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            Attach Files
          </button>
          <button onClick={sendMessage} disabled={!newMessage.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;
```

### 2. CSS Styles
```css
.global-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #ddd;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.mark-read-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.chat-search {
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 0.5rem;
}

.chat-search input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #eee;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.edited {
  font-style: italic;
  color: #666;
  font-size: 0.8em;
}

.message-files {
  margin-top: 0.5rem;
}

.message-files a {
  display: block;
  color: #007bff;
  text-decoration: none;
  margin-bottom: 0.25rem;
}

.read-receipts {
  margin-top: 0.5rem;
  font-size: 0.8em;
  color: #666;
}

.load-more-btn {
  margin: 1rem auto;
  display: block;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.message-input {
  padding: 1rem;
  border-top: 1px solid #ddd;
  background: #f5f5f5;
}

.message-input textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  min-height: 60px;
}

.input-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.input-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

.input-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}
```

## Usage Instructions

### 1. Initialize the Service
```javascript
import globalChatService from './globalChatService';

// Connect when user logs in
const token = localStorage.getItem('token');
globalChatService.connect(token);
```

### 2. Handle Authentication
```javascript
// On login
globalChatService.connect(token);

// On logout
globalChatService.disconnect();
```

### 3. API Call Examples
```javascript
// Send message
await globalChatService.sendMessage('Hello everyone!');

// Send message with files
const files = [file1, file2]; // File objects from input
await globalChatService.sendMessage('Check these files', files);

// Get messages
const data = await globalChatService.getMessages(20);

// Mark all as read
await globalChatService.markAllRead();

// Search messages
const results = await globalChatService.searchMessages('hello');
```

### 4. Real-time Events
The service automatically handles real-time updates. You can set custom callbacks:

```javascript
globalChatService.on('onNewMessage', (message) => {
  // Handle new message
  console.log('New message:', message);
});

globalChatService.on('onUnreadCountChange', (count) => {
  // Update unread count badge
  updateUnreadBadge(count);
});
```

## File Upload Support
- Supports up to 5 files per message
- Maximum file size: 10MB per file
- Supported types: Images, PDF, Office docs, text files, CSV, ZIP
- Files are automatically handled in the sendMessage method

## Error Handling
All methods throw errors that should be caught and handled appropriately:

```javascript
try {
  await globalChatService.sendMessage('Hello');
} catch (error) {
  console.error('Failed to send message:', error);
  // Show error message to user
}
```

## Socket Room
The service automatically joins the `global` room for real-time updates. No additional configuration needed.

This implementation provides a complete, production-ready global chat integration with real-time updates, file uploads, search functionality, and proper error handling.
