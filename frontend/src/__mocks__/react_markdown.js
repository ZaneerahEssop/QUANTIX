import React from 'react';

const ReactMarkdown = ({ children, ...props }) => {
  return <div data-testid="react-markdown-mock">{children}</div>;
};

export default ReactMarkdown;