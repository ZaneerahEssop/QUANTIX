const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const http = require("http");
const { Server } = require("socket.io");
const newEventRoutes = require("./src/Routes/newEvent.routes");
const getEventsRoutes = require("./src/Routes/getEvent.routes");
const editEventRoutes = require("./src/Routes/editEvent.routes");
const plannerRoutes = require("./src/Routes/planner.routes");
const exportRoutes = require("./src/Routes/export.routes");
const vendorRoutes = require("./src/Routes/vendor.routes");
const vendorRequestRoutes = require("./src/Routes/vendorRequest.routes");
const chatRoutes = require("./src/Routes/chat.routes");

const guestRoutes = require("./src/Routes/guests.routes");
const emailRoutes = require("./src/Routes/email.routes");

const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
// The fix
// 1. Add this line to tell Express to trust Railway's proxy
app.set('trust proxy', 1);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // 2. Add transports for better proxy compatibility
  transports: ['websocket', 'polling']
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes go here
app.use("/api/events", getEventsRoutes);
app.use("/api/events", newEventRoutes);
app.use("/api/events", editEventRoutes);
app.use("/api/planners", plannerRoutes);
app.use("/api/events", exportRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-requests", vendorRequestRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/chat", chatRoutes);
// Add the new guests route
app.use("/api/guests", guestRoutes);


// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, 'client/build')));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React app for any other GET requests that don't match API routes
// Using a more specific path pattern to avoid conflicts
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their personal room
  socket.on("join", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join conversation room
  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User joined conversation ${conversationId}`);
  });

  // Handle new message
  socket.on("send_message", async (data) => {
    try {
      const {
        conversationId,
        senderId,
        messageText,
        messageType = "text",
      } = data;

      console.log("Received message:", {
        conversationId,
        senderId,
        messageText,
        messageType,
      });

      // Save message to database
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          message_text: messageText,
          message_type: messageType,
        })
        .select(
          `
          *,
          sender:users(name, user_role)
        `
        )
        .single();

      if (error) {
        console.error("Error saving message:", error);
        socket.emit("message_error", { error: "Failed to send message" });
        return;
      }

      console.log("Message saved successfully:", message);
    

      // Broadcast message to conversation room
      console.log(
        `Broadcasting to conversation room: conversation_${conversationId}`
      );
      io.to(`conversation_${conversationId}`).emit("new_message", message);

      // Also notify users in their personal rooms
      const { data: conversation } = await supabase
        .from("conversations")
        .select("planner_id, vendor_id")
        .eq("conversation_id", conversationId)
        .single();

      if (conversation) {
        console.log("Sending notifications to users:", conversation);
        io.to(`user_${conversation.planner_id}`).emit("message_notification", {
          conversationId,
          message: messageText,
          sender: message.sender.name,
        });
        io.to(`user_${conversation.vendor_id}`).emit("message_notification", {
          conversationId,
          message: messageText,
          sender: message.sender.name,
        });
      }
    } catch (error) {
      console.error("Error in send_message:", error);
      socket.emit("message_error", { error: "Internal server error" });
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    socket.to(`conversation_${data.conversationId}`).emit("user_typing", {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
