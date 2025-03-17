import React from 'react';
import { Alert, List, Progress, Typography, Tag } from 'antd';
import { FormIssue, FormIssueSeverity, FormAnalysisResult } from '../../utils/formAnalysis';
import { JerkPhase } from '../../utils/jerkFSM';
import './FormFeedbackComponent.css';

const { Title, Text } = Typography;

interface FormFeedbackComponentProps {
  formAnalysis: FormAnalysisResult | null;
  currentPhase: JerkPhase;
}

/**
 * Component for displaying form feedback to the user
 */
const FormFeedbackComponent: React.FC<FormFeedbackComponentProps> = ({
  formAnalysis,
  currentPhase
}) => {
  if (!formAnalysis) {
    return (
      <div className="form-feedback-container">
        <Title level={4}>Form Feedback</Title>
        <Text type="secondary">No form analysis available yet.</Text>
      </div>
    );
  }

  const { issues, overallScore } = formAnalysis;

  // Get color for progress bar based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a'; // Green
    if (score >= 60) return '#faad14'; // Yellow
    return '#f5222d'; // Red
  };

  // Get color for issue severity tag
  const getSeverityColor = (severity: FormIssueSeverity): string => {
    switch (severity) {
      case FormIssueSeverity.LOW:
        return 'blue';
      case FormIssueSeverity.MODERATE:
        return 'orange';
      case FormIssueSeverity.HIGH:
        return 'red';
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
    <div className="form-feedback-container">
      <Title level={4}>Form Feedback</Title>
      
      <div className="form-score-container">
        <Text strong>Form Score:</Text>
        <Progress 
          type="circle" 
          percent={overallScore} 
          width={80} 
          strokeColor={getScoreColor(overallScore)}
          format={percent => `${percent}`}
        />
      </div>
      
      <div className="current-phase-container">
        <Text strong>Current Phase:</Text>
        <Tag color="blue">{getPhaseDisplayName(currentPhase)}</Tag>
      </div>
      
      {issues.length > 0 ? (
        <div className="form-issues-container">
          <Text strong>Form Issues:</Text>
          <List
            size="small"
            dataSource={issues}
            renderItem={issue => (
              <List.Item>
                <Alert
                  message={
                    <div className="issue-alert-content">
                      <Tag color={getSeverityColor(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Tag>
                      <span>{issue.message}</span>
                    </div>
                  }
                  type="info"
                  showIcon
                />
              </List.Item>
            )}
          />
        </div>
      ) : (
        <div className="no-issues-container">
          <Alert
            message="Good form!"
            description="No issues detected with your current form."
            type="success"
            showIcon
          />
        </div>
      )}
    </div>
  );
};

export default FormFeedbackComponent;