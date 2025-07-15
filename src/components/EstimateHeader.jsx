import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.div`
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 768px) {
    padding: 15px;
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 24px;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const EstimateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: #666;

  @media (max-width: 768px) {
    font-size: 13px;
    width: 100%;
  }
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => (props.dirty ? '#fff3cd' : '#d4edda')};
  color: ${props => (props.dirty ? '#856404' : '#155724')};
  border: 1px solid ${props => (props.dirty ? '#ffeaa7' : '#c3e6cb')};

  @media (max-width: 768px) {
    font-size: 11px;
    padding: 3px 6px;
  }
`;

const EstimateHeader = ({ estimate, onEstimateChange, isDirty, title }) => {
  return (
    <HeaderContainer>
      <div>
        <Title>{title || estimate?.estimate_name || '見積作成'}</Title>
        {estimate && (
          <EstimateInfo>
            <div>案件ID: {estimate.estimate_id}</div>
            <div>お客様: {estimate.client_name}</div>
            <div>現場: {estimate.site_address}</div>
          </EstimateInfo>
        )}
      </div>
      <div>
        <StatusBadge dirty={isDirty}>{isDirty ? '未保存' : '保存済み'}</StatusBadge>
      </div>
    </HeaderContainer>
  );
};

export default EstimateHeader;
