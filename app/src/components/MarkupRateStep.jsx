import React, { useState } from 'react';
import styled from 'styled-components';
import { FiPercent, FiInfo } from 'react-icons/fi';

const Container = styled.div`
  padding: 40px;
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: #2d5a2d;
  margin-bottom: 30px;
  text-align: center;
`;

const InfoCard = styled.div`
  background: #e8f5e8;
  border: 1px solid #4a7c4a;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
`;

const InfoText = styled.p`
  color: #2d5a2d;
  margin: 0;
  flex: 1;
`;

const InputContainer = styled.div`
  background: white;
  border: 2px solid #e8f5e8;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Label = styled.label`
  display: block;
  color: #2d5a2d;
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 16px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e8f5e8;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a7c4a;
    background-color: #fafafa;
  }

  &:hover {
    border-color: #6a9a6a;
  }
`;

const PercentIcon = styled.div`
  color: #4a7c4a;
  font-size: 24px;
  font-weight: 600;
`;

const ExampleText = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
`;

const ButtonContainer = styled.div`
  margin-top: 40px;
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const Button = styled.button.attrs({ type: 'button' })`
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:disabled {
    background: #ddd;
    color: #999;
    cursor: not-allowed;
  }
`;

const NextButton = styled(Button)`
  background: #4a7c4a;
  color: white;

  &:hover:not(:disabled) {
    background: #2d5a2d;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const BackButton = styled(Button)`
  background: transparent;
  color: #4a7c4a;
  border: 2px solid #4a7c4a;

  &:hover {
    background: #e8f5e8;
  }
`;

const MarkupRateStep = ({ onNext, onBack, initialRate = 1.3 }) => {
  const [markupRate, setMarkupRate] = useState(initialRate);

  const handleRateChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 1) {
      setMarkupRate(value);
    }
  };

  const handleNext = () => {
    console.log('handleNext called with markupRate:', markupRate);
    if (onNext) {
      onNext(markupRate);
    } else {
      console.error('onNext function is not provided');
    }
  };

  const calculateExample = () => {
    const baseCost = 10000;
    const finalPrice = Math.round(baseCost * markupRate);
    const profit = finalPrice - baseCost;
    const profitRate = ((profit / baseCost) * 100).toFixed(1);

    return {
      baseCost,
      finalPrice,
      profit,
      profitRate
    };
  };

  const example = calculateExample();

  return (
    <Container>
      <Title>掛け率の設定</Title>

      <InfoCard>
        <FiInfo size={24} color="#4a7c4a" />
        <InfoText>
          単価マスターの全項目に適用する掛け率を設定してください。
          この掛け率は原価に対して掛けられ、販売価格が計算されます。
        </InfoText>
      </InfoCard>

      <InputContainer>
        <Label>掛け率を入力してください</Label>
        <InputWrapper>
          <Input
            type="number"
            value={markupRate}
            onChange={handleRateChange}
            min="1"
            step="0.1"
            placeholder="1.3"
          />
          <PercentIcon>倍</PercentIcon>
        </InputWrapper>

        <ExampleText>
          <strong>計算例：</strong><br />
          原価 ¥{example.baseCost.toLocaleString()} × {markupRate} = 
          <strong> ¥{example.finalPrice.toLocaleString()}</strong><br />
          利益: ¥{example.profit.toLocaleString()} （利益率: {example.profitRate}%）
        </ExampleText>
      </InputContainer>

      <ButtonContainer>
        <BackButton onClick={onBack}>
          戻る
        </BackButton>
        <NextButton 
          onClick={handleNext}
          disabled={!markupRate || markupRate < 1}
        >
          次へ進む
        </NextButton>
      </ButtonContainer>
    </Container>
  );
};

export default MarkupRateStep;