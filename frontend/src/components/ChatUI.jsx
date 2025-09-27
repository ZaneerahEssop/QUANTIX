import React, { useState, useRef, useEffect } from 'react';
import { BsEmojiSmile, BsPaperclip, BsSend } from 'react-icons/bs';
import { FaComments } from 'react-icons/fa';
import styled from 'styled-components';
import VendorSearch from './VendorSearch';

// Styled Components
const ComponentWrapper = styled.div`
  /* The parent container will handle margins */
`;

const ComponentHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    color: #333;
    margin: 0 0 0 0.75rem;
  }

  svg {
    color: #ff9c6d; /* Using a color from your theme */
  }
`;


const ChatContainer = styled.div`
  display: flex;
  flex-direction: row; /* Changed to row for side-by-side layout */
  height: 500px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
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
      
      .name {
        font-weight: 600;
        color: #5c3c2e;
        margin-bottom: 2px;
        font-size: 0.9rem;
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
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-left: 1px solid #e9ecef;
`;

const MessageBubble = styled.div`
  max-width: 75%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  position: relative;
  line-height: 1.4;
  font-size: 0.9375rem;
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
  ${({ $isCurrentUser }) => $isCurrentUser ? 'color: #721c24;' : 'color: #495057;'}
`;

const MessageTime = styled.div`
  font-size: 0.6875rem;
  text-align: ${({ $isCurrentUser }) => $isCurrentUser ? 'right' : 'left'};
  margin-top: 0.25rem;
  opacity: 0.8;
  color: ${({ $isCurrentUser }) => $isCurrentUser ? '#721c24' : '#6c757d'};
`;

const InputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  background: #fff;
`;

const InputForm = styled.form`
  display: flex;
  gap: 0.5rem;
  align-items: center;
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
  
  &:focus {
    outline: none;
    border-color: #ffb38a;
    box-shadow: 0 0 0 2px rgba(255, 179, 138, 0.3);
  }
  
  &::placeholder {
    color: #c4a99a;
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
  
  &:hover {
    background: #ffede1;
    color: #d45a29;
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

const ChatUI = ({ 
  listTitle = 'Vendors',
  onSendMessage,
  onSelectVendor,
  selectedVendor = null,
  messages = [],
  showSearch = true,
  vendors = [],
  unreadCount = 0
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // No need for localMessages state since we're using props for messages

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


  return (
    <ComponentWrapper>
      <ComponentHeader>
        <FaComments size={22} />
        <h2>Chat</h2>
        {unreadCount > 0 && (
          <div style={{
            backgroundColor: '#ff4444',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </ComponentHeader>
      <ChatContainer>
        <Sidebar>
          {showSearch ? (
            <>
              <VendorSearch 
                onSelectVendor={onSelectVendor}
                selectedVendorId={selectedVendor?.id}
              />
              <ChatList>
                {selectedVendor && (
                  <div 
                    className="chat-item active"
                    onClick={() => onSelectVendor(selectedVendor)}
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
                  onClick={() => onSelectVendor(vendor)}
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
        
        <ChatArea>
          {selectedVendor ? (
            <>
              <ChatHeader>
                <h3>{selectedVendor.name}</h3>
              </ChatHeader>
              <MessagesContainer>
      
              {messages.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: '#8c6b5e',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <h3 style={{ marginBottom: '0.5rem', color: '#5c3c2e' }}>No messages yet</h3>
                  <p style={{ fontSize: '0.9rem' }}>Send a message to start the conversation with {selectedVendor.name}.</p>
                </div>
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
                  <IconButton type="button">
                    <BsEmojiSmile size={18} />
                  </IconButton>
                  <IconButton type="button">
                    <BsPaperclip size={18} />
                  </IconButton>
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedVendor.name}...`}
                    disabled={!selectedVendor}
                  />
                  <SendButton type="submit">
                    <BsSend size={16} />
                  </SendButton>
                </InputForm>
              </InputContainer>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8c6b5e',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <FaComments size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3 style={{ marginBottom: '0.5rem', color: '#5c3c2e' }}>No chat selected</h3>
              <p style={{ fontSize: '0.9rem' }}>Select a contact to start chatting</p>
            </div>
          )}
        </ChatArea>
      </ChatContainer>
    </ComponentWrapper>
  );
};

export default ChatUI;