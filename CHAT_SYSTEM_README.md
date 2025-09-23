# QUANTIX Real-Time Chat System

This document describes the real-time chat system implementation for QUANTIX, enabling communication between planners and vendors.

## 🚀 Features

- **Real-time messaging** between planners and vendors
- **WebSocket-based** instant message delivery
- **Message persistence** in Supabase database
- **Unread message indicators**
- **Conversation management**
- **Typing indicators** (ready for implementation)
- **Message notifications**

## 📁 File Structure

### Backend Files
```
Backend/
├── database_schema.sql              # Database schema for chat tables
├── src/
│   ├── Controllers/
│   │   └── chat.controller.js      # Chat API controllers
│   ├── Routes/
│   │   └── chat.routes.js          # Chat API routes
│   └── supabaseClient.js           # Supabase client configuration
├── server.js                       # Updated with WebSocket support
└── package.json                    # Updated with socket.io dependency
```

### Frontend Files
```
src/
├── services/
│   └── chatService.js              # Chat service for WebSocket and API calls
├── components/
│   └── ChatUI.jsx                  # Updated with unread count support
├── pages/
│   ├── PlannerDashboard.jsx        # Updated with real-time chat
│   └── VendorDashboard.jsx         # Updated with real-time chat
└── package.json                    # Updated with socket.io-client
```

## 🗄️ Database Schema

The chat system uses two main tables:

### `conversations`
- `conversation_id` (UUID, Primary Key)
- `planner_id` (UUID, Foreign Key to users)
- `vendor_id` (UUID, Foreign Key to users)
- `event_id` (UUID, Foreign Key to events, nullable)
- `created_at`, `updated_at`, `last_message_at` (Timestamps)
- `is_active` (Boolean)

### `messages`
- `message_id` (UUID, Primary Key)
- `conversation_id` (UUID, Foreign Key to conversations)
- `sender_id` (UUID, Foreign Key to users)
- `message_text` (Text)
- `message_type` (VARCHAR, default: 'text')
- `is_read` (Boolean)
- `created_at`, `updated_at` (Timestamps)

## 🔧 Installation

### 1. Install Dependencies

**For Windows:**
```bash
install_dependencies.bat
```

**For Linux/Mac:**
```bash
chmod +x install_dependencies.sh
./install_dependencies.sh
```

**Manual Installation:**
```bash
# Backend
cd Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

### 2. Database Setup

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Run the SQL from `Backend/database_schema.sql`
4. This will create the necessary tables, indexes, and RLS policies

### 3. Environment Variables

Ensure your backend has the following environment variables:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000
```

## 🚀 Usage

### Starting the System

1. **Start Backend Server:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm start
   ```

### How It Works

#### For Planners:
1. Navigate to the Planner Dashboard
2. Use the vendor search to find a vendor
3. Select a vendor to start/continue a conversation
4. Messages are sent and received in real-time
5. Unread message count is displayed in the chat header

#### For Vendors:
1. Navigate to the Vendor Dashboard
2. View conversations with planners in the chat panel
3. Select a planner to start/continue a conversation
4. Messages are sent and received in real-time
5. Unread message count is displayed in the chat header

## 🔌 API Endpoints

### Chat API Routes (`/api/chat`)

- `POST /conversations` - Get or create a conversation
- `GET /conversations/:userId` - Get user's conversations
- `GET /conversations/:conversationId/messages` - Get conversation messages
- `POST /messages` - Send a message
- `POST /messages/read` - Mark messages as read
- `GET /unread/:userId` - Get unread message count

### WebSocket Events

**Client to Server:**
- `join` - Join user's personal room
- `join_conversation` - Join a conversation room
- `send_message` - Send a message
- `typing` - Send typing indicator

**Server to Client:**
- `new_message` - New message received
- `message_error` - Message sending error
- `message_notification` - Message notification
- `user_typing` - User typing indicator

## 🛠️ Technical Details

### Real-time Communication
- Uses Socket.IO for WebSocket connections
- Automatic fallback to polling if WebSocket fails
- Room-based messaging for conversations
- Personal rooms for user notifications

### Message Flow
1. User sends message via ChatUI
2. Message sent via WebSocket for real-time delivery
3. Message also saved via API for persistence
4. All participants in conversation receive the message
5. Unread count updated automatically

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own conversations
- Message access restricted to conversation participants
- Proper authentication checks on all endpoints

## 🔧 Customization

### Adding Message Types
To support different message types (images, files, etc.):

1. Update the `message_type` enum in the database schema
2. Modify the `sendMessage` functions to accept the type
3. Update the ChatUI to handle different message types

### Adding Typing Indicators
The WebSocket infrastructure is ready for typing indicators:

```javascript
// Send typing indicator
chatService.sendTyping(conversationId, userId, true);

// Listen for typing indicators
chatService.onTyping((data) => {
  // Handle typing indicator
});
```

### Adding Message Notifications
The system supports browser notifications:

```javascript
// Request notification permission
if (Notification.permission === 'granted') {
  new Notification('New message', {
    body: 'You have a new message from ' + senderName
  });
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend server is running
   - Verify CORS settings in server.js
   - Check browser console for connection errors

2. **Messages Not Sending**
   - Check database connection
   - Verify Supabase credentials
   - Check API endpoint responses

3. **Real-time Updates Not Working**
   - Ensure WebSocket connection is established
   - Check if user is in the correct conversation room
   - Verify message listeners are set up

### Debug Mode
Enable debug logging by adding to your browser console:
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
```

## 📈 Performance Considerations

- Messages are paginated (50 per page by default)
- Database indexes on frequently queried columns
- WebSocket rooms for efficient message broadcasting
- Automatic cleanup of old connections

## 🔒 Security Considerations

- All API endpoints require authentication
- RLS policies prevent unauthorized access
- Message content is not logged in server logs
- WebSocket connections are authenticated via user ID

## 🚀 Future Enhancements

- File/image message support
- Message reactions and replies
- Conversation search functionality
- Message encryption
- Push notifications
- Message status indicators (sent, delivered, read)
- Group conversations for multiple vendors/planners

## 📞 Support

For issues or questions about the chat system:
1. Check the troubleshooting section
2. Review the browser console for errors
3. Verify database schema is correctly applied
4. Ensure all dependencies are installed

---

The chat system is now fully integrated and ready for use! 🎉
