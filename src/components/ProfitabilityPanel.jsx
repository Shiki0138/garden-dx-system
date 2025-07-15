import React from 'react';
import styled from 'styled-components';

const PanelContainer = styled.div`
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-top: 20px;
`;

const PanelTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const MetricLabel = styled.span`
  color: #666;
`;

const MetricValue = styled.span`
  font-weight: bold;
  color: #333;
`;

const ProfitabilityPanel = ({ profitability }) => {
  const formatCurrency = amount => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <PanelContainer>
      <PanelTitle>収益性分析</PanelTitle>
      <MetricRow>
        <MetricLabel>原価:</MetricLabel>
        <MetricValue>{formatCurrency(profitability?.cost)}</MetricValue>
      </MetricRow>
      <MetricRow>
        <MetricLabel>利益:</MetricLabel>
        <MetricValue>{formatCurrency(profitability?.profit)}</MetricValue>
      </MetricRow>
      <MetricRow>
        <MetricLabel>利益率:</MetricLabel>
        <MetricValue>{profitability?.profit_margin || 0}%</MetricValue>
      </MetricRow>
    </PanelContainer>
  );
};

export default ProfitabilityPanel;
