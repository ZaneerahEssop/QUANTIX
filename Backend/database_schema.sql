-- Chat System Database Schema
-- Run this SQL in your Supabase SQL editor to create the necessary tables

-- Conversations table to track chat sessions between planners and vendors
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    planner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(planner_id, vendor_id, event_id)
);

-- Messages table to store individual chat messages
CREATE TABLE IF NOT EXISTS messages (
    message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_planner ON conversations(planner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_event ON conversations(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update last_message_at when a new message is inserted
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        planner_id = auth.uid() OR vendor_id = auth.uid()
    );

CREATE POLICY "Users can create conversations they participate in" ON conversations
    FOR INSERT WITH CHECK (
        planner_id = auth.uid() OR vendor_id = auth.uid()
    );

CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        planner_id = auth.uid() OR vendor_id = auth.uid()
    );

-- RLS Policies for messages
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM conversations 
            WHERE planner_id = auth.uid() OR vendor_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT conversation_id FROM conversations 
            WHERE planner_id = auth.uid() OR vendor_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
