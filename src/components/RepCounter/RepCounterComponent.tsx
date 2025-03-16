import React, { useState, useEffect } from 'react';
import { Card, Statistic, Button, Slider, Typography, Space } from 'antd';
import { ReloadOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import './RepCounterComponent.css';

const { Title } = Typography;

interface RepCounterComponentProps {
  repCount: number;
  isActive: boolean;
  onToggleActive: () => void;
  onResetCounter: () => void;
}

const RepCounterComponent: React.FC<RepCounterComponentProps> = ({
  repCount,
  isActive,
  onToggleActive,
  onResetCounter,
}) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  // Start/stop timer based on active state
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    
    if (isActive) {
      if (!startTime) {
        setStartTime(Date.now() - elapsedTime);
      }
      
      intervalId = setInterval(() => {
        setElapsedTime(Date.now() - (startTime || Date.now()));
      }, 100);
    } else if (startTime) {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, startTime, elapsedTime]);
  
  // Format elapsed time as mm:ss
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Reset timer and counter
  const handleReset = () => {
    setStartTime(null);
    setElapsedTime(0);
    onResetCounter();
  };
  
  return (
    <div className="rep-counter-container">
      <Card className="rep-counter-card">
        <Title level={3} className="rep-counter-title">Repetition Counter</Title>
        
        <div className="rep-counter-stats">
          <Statistic 
            title="Repetitions" 
            value={repCount} 
            className="rep-counter-statistic"
          />
          
          <Statistic 
            title="Time" 
            value={formatTime(elapsedTime)} 
            className="rep-counter-statistic"
          />
        </div>
        
        <div className="rep-counter-controls">
          <Space>
            <Button
              type="primary"
              icon={isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={onToggleActive}
              size="large"
            >
              {isActive ? 'Pause' : 'Start'} Tracking
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="large"
            >
              Reset
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default RepCounterComponent;
