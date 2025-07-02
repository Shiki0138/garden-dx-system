import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.div`
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 24px;
`;

const EstimateHeader = ({ title }) => {
  return (
    <HeaderContainer>
      <Title>{title || '見積作成'}</Title>
    </HeaderContainer>
  );
};

export default EstimateHeader;