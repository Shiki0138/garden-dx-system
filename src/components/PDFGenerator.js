import React from 'react';
import styled from 'styled-components';
import { FiFileText, FiDownload } from 'react-icons/fi';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Card = styled.div`
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 40px;
`;

const Title = styled.h1`
  color: #2e7d32;
  font-size: 28px;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const PDFGenerator = () => {
  return (
    <Container>
      <Card>
        <Title>
          <FiFileText />
          PDF生成機能
        </Title>
        <p>PDF生成機能は見積ウィザードに統合されています。</p>
      </Card>
    </Container>
  );
};

export default PDFGenerator;