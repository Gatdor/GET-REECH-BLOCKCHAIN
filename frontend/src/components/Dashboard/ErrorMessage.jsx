// src/components/Dashboard/ErrorMessage.jsx
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Wrapper = styled(motion.div)`
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin: 1rem 0;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  grid-column: 1 / -1;
`;

const ErrorMessage = ({ children, ...props }) => {
  if (!children) return null;
  return (
    <Wrapper role="alert" aria-live="assertive" {...props}>
      {children}
    </Wrapper>
  );
};

export default ErrorMessage;