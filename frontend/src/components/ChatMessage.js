import React from 'react';

const ChatMessage = ({ role, content }) => (
  <div className={role === 'user' ? 'user-message' : 'assistant-message'}>
    <strong>{role === 'user' ? 'You: ' : 'AI: '}</strong>
    {content}
  </div>
);

export default ChatMessage;