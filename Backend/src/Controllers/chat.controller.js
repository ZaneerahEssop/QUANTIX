const supabase = require("../Config/supabase");
const axios = require('axios');


const getOrCreateConversation = async (req, res) => {
  try {
    const { plannerId, vendorId } = req.body;

    if (!plannerId || !vendorId) {
      return res
        .status(400)
        .json({ error: "Planner ID and Vendor ID are required" });
    }

    // Check if conversation already exists
    const { data: existingConversation, error: findError } = await supabase
      .from("conversations")
      .select("*")
      .eq("planner_id", plannerId)
      .eq("vendor_id", vendorId)
      .eq("is_active", true)
      .maybeSingle(); // <-- FIX: Changed .single() to .maybeSingle()

    if (findError) {
        // Handle cases where multiple conversations might exist for the same pair
        if (findError.code === 'PGRST116') {
            console.error('Multiple active conversations found for this pair. Please check data integrity.');
            return res.status(500).json({ error: 'Data integrity issue: Multiple conversations found.' });
        }
        throw findError;
    }

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        planner_id: plannerId,
        vendor_id: vendorId,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return res.status(500).json({ error: "Failed to create conversation" });
    }

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all conversations for a user (planner or vendor)
const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get conversations where user is either planner or vendor
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        planner:planners(name),
        vendor:vendors(name)
      `
      )
      .or(`planner_id.eq.${userId},vendor_id.eq.${userId}`)
      .eq("is_active", true)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a conversation
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const offset = (page - 1) * limit;

    // Get messages with sender information
    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:users(name, user_role)
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      senderId,
      messageText,
      messageType = "text",
    } = req.body;

    if (!conversationId || !senderId || !messageText) {
      return res.status(400).json({
        error: "Conversation ID, Sender ID, and message text are required",
      });
    }
    
    // --- Profanity Censoring Logic Starts Here ---
    let textToSave = messageText;

    try {
      const response = await axios.post(
        `${process.env.MODERATION_API_URL}/api/v1/check`,
        { text: messageText },
        {
          headers: {
            'X-Api-Key': process.env.MODERATION_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      textToSave = response.data.censored_text;
    } catch (apiError) {
      console.error("Moderation API call failed. Using original message.", apiError.message);
    }
    // --- Profanity Censoring Logic Ends Here ---

    // Verify conversation exists and user is participant
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("conversation_id", conversationId)
      .or(`planner_id.eq.${senderId},vendor_id.eq.${senderId}`)
      .single();

    if (convError || !conversation) {
      return res
        .status(403)
        .json({ error: "Unauthorized or conversation not found" });
    }

    // Insert the (now censored) message into the database
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_text: textToSave,
        message_type: messageType,
      })
      .select(
        `
        *,
        sender:users(name, user_role)
      `
      )
      .single();

    if (messageError) {
      console.error("Error sending message:", messageError);
      return res.status(500).json({ error: "Failed to send message" });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      return res
        .status(400)
        .json({ error: "Conversation ID and User ID are required" });
    }

    // Mark all unread messages in the conversation as read for this user
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
      return res.status(500).json({ error: "Failed to mark messages as read" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get unread message count for a user
const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data: userConversations, error: convError } = await supabase
      .from("conversations")
      .select("conversation_id")
      .or(`planner_id.eq.${userId},vendor_id.eq.${userId}`)
      .eq("is_active", true);

    if (convError) {
      console.error("Error fetching user conversations:", convError);
      return res
        .status(500)
        .json({ error: "Failed to fetch user conversations" });
    }

    if (!userConversations || userConversations.length === 0) {
      return res.status(200).json({ unreadCount: 0 });
    }

    const conversationIds = userConversations.map(
      (conv) => conv.conversation_id
    );

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching unread count:", error);
      return res.status(500).json({ error: "Failed to fetch unread count" });
    }

    res.status(200).json({ unreadCount: count || 0 });
  } catch (error) {
    // FIX: Improved error logging to show full details
    console.error("Full error in getUnreadCount:", JSON.stringify(error, null, 2));
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
};