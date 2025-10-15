import React, { useState, useRef, useEffect } from 'react';
import { BsEmojiSmile, BsPaperclip, BsSend } from 'react-icons/bs';
import { FaComments } from 'react-icons/fa';
import styled from 'styled-components';
import VendorSearch from './VendorSearch';

// Styled Components
const ComponentWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  overflow: hidden;
`;

const ComponentHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    color: #333;
    margin: 0 0 0 0.75rem;
    font-size: 1.5rem;
  }

  svg {
    color: #ff9c6d;
  }

  @media (max-width: 768px) {
    h2 {
      font-size: 1.25rem;
    }
  }
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 500px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;

  @media (max-width: 768px) {
    flex-direction: column;
    height: 600px;
  }
`;

const Sidebar = styled.div`
  width: 250px;
  background: #fff;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  
  h3 {
    margin: 0 0 1rem 0;
    color: #5c3c2e;
    font-size: 1.25rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 0.5rem;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
  }
`;

const ChatList = styled.div`
  .chat-item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #ffe4d6;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    
    &:hover {
      background: #ffede1;
    }
    
    &.active {
      background: #ffe4d6;
    }
    
    .info {
      flex: 1;
      min-width: 0;
      
      .name {
        font-weight: 600;
        color: #5c3c2e;
        margin-bottom: 2px;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .last-message {
        font-size: 0.8rem;
        color: #8c6b5e;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .unread-badge {
      background-color: #d45a29;
      color: white;
      font-size: 0.75rem;
      border-radius: 9999px;
      height: 20px;
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }
  }

  @media (max-width: 768px) {
    .chat-item {
      padding: 0.6rem 0.8rem;
    }
  }
`;

const ChatHeader = styled.div`
  background: #f8f9fa;
  color: #495057;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: #f8f9fa;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.5rem;
  }
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-left: 1px solid #e9ecef;

  @media (max-width: 768px) {
    border-left: none;
    flex: 1;
  }
`;

const MessageBubble = styled.div`
  max-width: 75%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  position: relative;
  line-height: 1.4;
  font-size: 0.9375rem;
  word-wrap: break-word;
  
  @media (max-width: 768px) {
    max-width: 85%;
    padding: 0.6rem 0.8rem;
    font-size: 0.875rem;
  }

  @media (max-width: 480px) {
    max-width: 90%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }

  ${({ $isCurrentUser }) => $isCurrentUser ? `
    align-self: flex-end;
    background: #f8d7da;
    color: #721c24;
    border-bottom-right-radius: 0.25rem;
  ` : `
    align-self: flex-start;
    background: #f8f9fa;
    color: #212529;
    border: 1px solid #e9ecef;
    border-bottom-left-radius: 0.25rem;
  `}
`;

const MessageHeader = styled.div`
  font-weight: 600;
  font-size: 0.8125rem;
  margin-bottom: 0.25rem;
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
  }

  ${({ $isCurrentUser }) => $isCurrentUser ? 'color: #721c24;' : 'color: #495057;'}
`;

const MessageTime = styled.div`
  font-size: 0.6875rem;
  text-align: ${({ $isCurrentUser }) => $isCurrentUser ? 'right' : 'left'};
  margin-top: 0.25rem;
  opacity: 0.8;
  color: ${({ $isCurrentUser }) => $isCurrentUser ? '#721c24' : '#6c757d'};

  @media (max-width: 480px) {
    font-size: 0.625rem;
  }
`;

const InputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  background: #fff;

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const InputForm = styled.form`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 480px) {
    gap: 0.25rem;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid #ffd0b3;
  border-radius: 9999px;
  font-size: 0.9rem;
  background: #fff;
  color: #5c3c2e;
  transition: all 0.2s;
  min-width: 0;
  
  &:focus {
    outline: none;
    border-color: #ffb38a;
    box-shadow: 0 0 0 2px rgba(255, 179, 138, 0.3);
  }
  
  &::placeholder {
    color: #c4a99a;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #8c6b5e;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: #ffede1;
    color: #d45a29;
  }

  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const SendButton = styled(IconButton)`
  background: #ff9c6d;
  color: white;
  
  &:hover {
    background: #ff8a50;
    color: white;
  }
`;

const MobileHeader = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    padding: 1rem;
    background: #fff;
    border-bottom: 1px solid #e9ecef;
    
    .back-button {
      background: none;
      border: none;
      font-size: 1.2rem;
      margin-right: 0.75rem;
      cursor: pointer;
      color: #ff9c6d;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }
    
    .vendor-name {
      font-weight: 600;
      color: #5c3c2e;
      font-size: 1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const UnreadBadge = styled.div`
  background-color: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c6b5e;
  text-align: center;
  padding: 2rem;

  h3 {
    margin-bottom: 0.5rem;
    color: #5c3c2e;
  }

  p {
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    
    h3 {
      font-size: 1.1rem;
    }
    
    p {
      font-size: 0.85rem;
    }
  }
`;

const ChatUI = ({ 
  listTitle = 'Vendors',
  onSendMessage,
  onSelectVendor,
  selectedVendor = null,
  messages = [],
  showSearch = true,
  vendors = [],
  unreadCount = 0,
  conversations = []
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatArea, setShowChatArea] = useState(false);
  const messagesEndRef = useRef(null);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setShowChatArea(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show chat area when vendor is selected on mobile
  useEffect(() => {
    if (selectedVendor && isMobileView) {
      setShowChatArea(true);
    }
  }, [selectedVendor, isMobileView]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !selectedVendor) return;
    
    const newMsg = {
      id: Date.now(),
      text: newMessage,
      timestamp: new Date().toISOString(),
      isCurrentUser: true,
      sender: 'You'
    };
    
    // Notify parent component
    if (onSendMessage) {
      onSendMessage({
        ...newMsg,
        vendorId: selectedVendor.id
      });
    }
    
    setNewMessage('');
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleVendorSelect = (vendor) => {
    onSelectVendor(vendor);
    if (isMobileView) {
      setShowChatArea(true);
    }
  };

  const handleBackToVendors = () => {
    setShowChatArea(false);
  };

  return (
    <ComponentWrapper>
      <ComponentHeader>
        <FaComments size={22} />
        <h2>Chat</h2>
        {unreadCount > 0 && (
          <UnreadBadge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </UnreadBadge>
        )}
      </ComponentHeader>

      <ChatContainer>
        {/* Sidebar - hidden on mobile when chat is open */}
        {(!isMobileView || !showChatArea) && (
          <Sidebar>
            {showSearch ? (
              <>
                <VendorSearch 
                  onSelectVendor={handleVendorSelect}
                  selectedVendorId={selectedVendor?.id}
                />
                <ChatList>
                  {conversations && conversations.length > 0 && conversations.map((conv) => (
                    <div
                      key={`conv-${conv.conversation_id || conv.id}`}
                      className={`chat-item ${selectedVendor?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleVendorSelect({ id: conv.id, name: conv.name })}
                    >
                      <div className="info">
                        <div className="name">{conv.name}</div>
                        <div className="last-message">{conv.lastMessage || 'Click to chat'}</div>
                      </div>
                      {conv.unread > 0 && (
                        <div className="unread-badge">{conv.unread}</div>
                      )}
                    </div>
                  ))}
                  {selectedVendor && !conversations.some(c => c.id === selectedVendor.id) && (
                    <div 
                      className="chat-item active"
                      onClick={() => handleVendorSelect(selectedVendor)}
                    >
                      <div className="info">
                        <div className="name">{selectedVendor.name}</div>
                        <div className="last-message">Click to chat</div>
                      </div>
                    </div>
                  )}
                </ChatList>
              </>
            ) : (
              <ChatList>
                {vendors.map(vendor => (
                  <div 
                    key={vendor.id}
                    className={`chat-item ${selectedVendor?.id === vendor.id ? 'active' : ''}`}
                    onClick={() => handleVendorSelect(vendor)}
                  >
                    <div className="info">
                      <div className="name">{vendor.name}</div>
                      <div className="last-message">{vendor.lastMessage || 'Click to chat'}</div>
                    </div>
                    {vendor.unread > 0 && (
                      <div className="unread-badge">
                        {vendor.unread}
                      </div>
                    )}
                  </div>
                ))}
              </ChatList>
            )}
          </Sidebar>
        )}
        
        {/* Chat Area */}
        {(!isMobileView || showChatArea) && (
          <ChatArea>
            {/* Mobile Back Button */}
            {isMobileView && (
              <MobileHeader>
                <button 
                  className="back-button"
                  onClick={handleBackToVendors}
                  aria-label="Back to vendors"
                >
                  ←
                </button>
                <div className="vendor-name">
                  {selectedVendor?.name || 'Chat'}
                </div>
              </MobileHeader>
            )}
            
            {selectedVendor ? (
              <>
                {/* Only show regular header on desktop */}
                {!isMobileView && (
                  <ChatHeader>
                    <h3>{selectedVendor.name}</h3>
                  </ChatHeader>
                )}
                
                <MessagesContainer>
                  {messages.length === 0 ? (
                    <EmptyState>
                      <h3>No messages yet</h3>
                      <p>Send a message to start the conversation with {selectedVendor.name}.</p>
                    </EmptyState>
                  ) : (
                    messages.map((message, index) => (
                      <MessageBubble
                        key={message.id ? `msg-${message.id}` : `temp-${message.timestamp}-${index}`}
                        $isCurrentUser={message.isCurrentUser}
                      >
                        <MessageHeader $isCurrentUser={message.isCurrentUser}>
                          {message.sender}
                        </MessageHeader>
                        {message.text}
                        <MessageTime $isCurrentUser={message.isCurrentUser}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </MessageTime>
                      </MessageBubble>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </MessagesContainer>
                
                <InputContainer>
                  <InputForm onSubmit={handleSendMessage}>
                    <IconButton type="button" aria-label="Add emoji">
                      <BsEmojiSmile size={18} />
                    </IconButton>
                    <IconButton type="button" aria-label="Attach file">
                      <BsPaperclip size={18} />
                    </IconButton>
                    <Input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={`Message ${selectedVendor.name}...`}
                      disabled={!selectedVendor}
                    />
                    <SendButton type="submit" aria-label="Send message">
                      <BsSend size={16} />
                    </SendButton>
                  </InputForm>
                </InputContainer>
              </>
            ) : (
              <EmptyState>
                <FaComments size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <h3>No chat selected</h3>
                <p>Select a contact to start chatting</p>
              </EmptyState>
            )}
          </ChatArea>
        )}
      </ChatContainer>
    </ComponentWrapper>
  );
};

export default ChatUI;