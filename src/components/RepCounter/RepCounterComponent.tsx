import React, { useState, useEffect } from 'react';
import { Card, Statistic, Button, Slider, Typography, Space, Tag } from 'antd';
import { ReloadOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { JerkPhase, getJerkFSMState } from '../../utils/jerkFSM';
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
  const [jerkState, setJerkState] = useState<any>(null);
  
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
  
  // Get current jerk state for display
  useEffect(() => {
    const updateJerkState = () => {
      setJerkState(getJerkFSMState());
    };

    // Update jerk state every 100ms when active
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      updateJerkState();
      interval = setInterval(updateJerkState, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Get color for phase tag
  const getPhaseTagColor = (phase: JerkPhase): string => {
    switch (phase) {
      case JerkPhase.RACK:
        return 'blue';
      case JerkPhase.DIP:
        return 'orange';
      case JerkPhase.DRIVE:
        return 'volcano';
      case JerkPhase.LOCKOUT:
        return 'green';
      default:
        return 'default';
    }
  };

  // Get readable name for phase
  const getPhaseDisplayName = (phase: JerkPhase): string => {
    switch (phase) {
      case JerkPhase.RACK:
        return 'Rack Position';
      case JerkPhase.DIP:
        return 'Dip Phase';
      case JerkPhase.DRIVE:
        return 'Drive Phase';
      case JerkPhase.LOCKOUT:
        return 'Lockout';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className="rep-counter-container">
      <Card className="rep-counter-card">
        <Title level={4}>Kettlebell Jerk Counter</Title>
        <div className="rep-counter-stats">
          <Statistic 
            title="Reps" 
            value={repCount} 
            className="rep-counter-statistic"
          />
          
          <Statistic 
            title="Time" 
            value={formatTime(elapsedTime)} 
            className="rep-counter-statistic"
          />
          
          {jerkState && (
            <div className="movement-phase-info">
              <div className="phase-label">Current Phase:</div>
              <Tag color={getPhaseTagColor(jerkState.currentPhase)} className="phase-tag">
                {getPhaseDisplayName(jerkState.currentPhase)}
              </Tag>
              
              {jerkState.isValidRep && (
                <div className="valid-rep-indicator">
                  <Tag color="success">Valid Movement</Tag>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="rep-counter-controls">
          <Space size="middle">
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
