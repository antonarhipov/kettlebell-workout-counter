import { Pose } from '../types';
import { getKeypoint, calculateAngle } from './poseDetection';
import { JerkPhase } from './jerkFSM';

/**
 * Types for form analysis
 */

// Severity levels for form issues
export enum FormIssueSeverity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high'
}

// Form issue object
export interface FormIssue {
  id: string;
  phase: JerkPhase;
  message: string;
  severity: FormIssueSeverity;
  bodyPart: string;
}

// Form analysis result
export interface FormAnalysisResult {
  issues: FormIssue[];
  overallScore: number; // 0-100 score for the form
  timestamp: number;
}

/**
 * Analyze rack position form
 * @param pose Current pose
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Array of form issues
 */
export const analyzeRackPosition = (
  pose: Pose,
  minConfidence: number = 0.3
): FormIssue[] => {
  const issues: FormIssue[] = [];

  // Get required keypoints
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightHip = getKeypoint(pose, 'right_hip');

  // Check if all required keypoints are detected with sufficient confidence
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
      !leftWrist || !rightWrist || !leftHip || !rightHip ||
      (leftShoulder.score || 0) < minConfidence ||
      (rightShoulder.score || 0) < minConfidence ||
      (leftElbow.score || 0) < minConfidence ||
      (rightElbow.score || 0) < minConfidence ||
      (leftWrist.score || 0) < minConfidence ||
      (rightWrist.score || 0) < minConfidence ||
      (leftHip.score || 0) < minConfidence ||
      (rightHip.score || 0) < minConfidence) {
    return issues;
  }

  // Check if elbows are too far from body
  const leftElbowToHipDistance = Math.abs(leftElbow.x - leftHip.x);
  const rightElbowToHipDistance = Math.abs(rightElbow.x - rightHip.x);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  if (leftElbowToHipDistance > shoulderWidth * 0.4) {
    issues.push({
      id: 'rack_left_elbow_position',
      phase: JerkPhase.RACK,
      message: 'Keep left elbow closer to your body',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'left_elbow'
    });
  }

  if (rightElbowToHipDistance > shoulderWidth * 0.4) {
    issues.push({
      id: 'rack_right_elbow_position',
      phase: JerkPhase.RACK,
      message: 'Keep right elbow closer to your body',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'right_elbow'
    });
  }

  // Check if wrists are at proper height (should be near shoulder level)
  const leftWristToShoulderDiff = Math.abs(leftWrist.y - leftShoulder.y);
  const rightWristToShoulderDiff = Math.abs(rightWrist.y - rightShoulder.y);

  if (leftWristToShoulderDiff > shoulderWidth * 0.2) {
    issues.push({
      id: 'rack_left_wrist_height',
      phase: JerkPhase.RACK,
      message: 'Adjust left kettlebell to shoulder height',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'left_wrist'
    });
  }

  if (rightWristToShoulderDiff > shoulderWidth * 0.2) {
    issues.push({
      id: 'rack_right_wrist_height',
      phase: JerkPhase.RACK,
      message: 'Adjust right kettlebell to shoulder height',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'right_wrist'
    });
  }

  return issues;
};

/**
 * Analyze dip phase form
 * @param pose Current pose
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Array of form issues
 */
export const analyzeDipPhase = (
  pose: Pose,
  minConfidence: number = 0.3
): FormIssue[] => {
  const issues: FormIssue[] = [];

  // Get required keypoints
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightHip = getKeypoint(pose, 'right_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const rightKnee = getKeypoint(pose, 'right_knee');
  const leftAnkle = getKeypoint(pose, 'left_ankle');
  const rightAnkle = getKeypoint(pose, 'right_ankle');
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');

  // Check if all required keypoints are detected with sufficient confidence
  if (!leftHip || !rightHip || !leftKnee || !rightKnee || 
      !leftAnkle || !rightAnkle || !leftShoulder || !rightShoulder ||
      (leftHip.score || 0) < minConfidence ||
      (rightHip.score || 0) < minConfidence ||
      (leftKnee.score || 0) < minConfidence ||
      (rightKnee.score || 0) < minConfidence ||
      (leftAnkle.score || 0) < minConfidence ||
      (rightAnkle.score || 0) < minConfidence ||
      (leftShoulder.score || 0) < minConfidence ||
      (rightShoulder.score || 0) < minConfidence) {
    return issues;
  }

  // Calculate knee angles
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

  // Check if dip is too shallow
  if (leftKneeAngle > 160) {
    issues.push({
      id: 'dip_too_shallow',
      phase: JerkPhase.DIP,
      message: 'Deepen your dip for more power',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'knees'
    });
  }

  // Check if dip is too deep
  if (leftKneeAngle < 120) {
    issues.push({
      id: 'dip_too_deep',
      phase: JerkPhase.DIP,
      message: 'Dip is too deep, aim for quarter squat',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'knees'
    });
  }

  // Check if knees are aligned (should have similar angles)
  if (Math.abs(leftKneeAngle - rightKneeAngle) > 15) {
    issues.push({
      id: 'dip_uneven_knees',
      phase: JerkPhase.DIP,
      message: 'Keep knees evenly bent',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'knees'
    });
  }

  // Check torso position (should remain upright)
  const torsoAngle = calculateAngle(
    { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 },
    { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 },
    { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 - 100 }
  );

  if (torsoAngle < 75) {
    issues.push({
      id: 'dip_leaning_forward',
      phase: JerkPhase.DIP,
      message: 'Keep torso more upright',
      severity: FormIssueSeverity.HIGH,
      bodyPart: 'torso'
    });
  }

  return issues;
};

/**
 * Analyze drive phase form
 * @param pose Current pose
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Array of form issues
 */
export const analyzeDrivePhase = (
  pose: Pose,
  minConfidence: number = 0.3
): FormIssue[] => {
  const issues: FormIssue[] = [];

  // Get required keypoints
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightHip = getKeypoint(pose, 'right_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const rightKnee = getKeypoint(pose, 'right_knee');

  // Check if all required keypoints are detected with sufficient confidence
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
      !leftWrist || !rightWrist || !leftHip || !rightHip ||
      !leftKnee || !rightKnee ||
      (leftShoulder.score || 0) < minConfidence ||
      (rightShoulder.score || 0) < minConfidence ||
      (leftElbow.score || 0) < minConfidence ||
      (rightElbow.score || 0) < minConfidence ||
      (leftWrist.score || 0) < minConfidence ||
      (rightWrist.score || 0) < minConfidence ||
      (leftHip.score || 0) < minConfidence ||
      (rightHip.score || 0) < minConfidence ||
      (leftKnee.score || 0) < minConfidence ||
      (rightKnee.score || 0) < minConfidence) {
    return issues;
  }

  // Check if arms are extending evenly
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  if (Math.abs(leftArmAngle - rightArmAngle) > 20) {
    issues.push({
      id: 'drive_uneven_arms',
      phase: JerkPhase.DRIVE,
      message: 'Extend arms evenly',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'arms'
    });
  }

  // Check if knees are extending (should be straightening)
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, { x: leftKnee.x, y: leftKnee.y + 100 });
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, { x: rightKnee.x, y: rightKnee.y + 100 });

  if (leftKneeAngle < 160 || rightKneeAngle < 160) {
    issues.push({
      id: 'drive_incomplete_leg_extension',
      phase: JerkPhase.DRIVE,
      message: 'Fully extend legs for maximum power',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'legs'
    });
  }

  return issues;
};

/**
 * Analyze lockout phase form
 * @param pose Current pose
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Array of form issues
 */
export const analyzeLockoutPhase = (
  pose: Pose,
  minConfidence: number = 0.3
): FormIssue[] => {
  const issues: FormIssue[] = [];

  // Get required keypoints
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');

  // Check if all required keypoints are detected with sufficient confidence
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
      !leftWrist || !rightWrist ||
      (leftShoulder.score || 0) < minConfidence ||
      (rightShoulder.score || 0) < minConfidence ||
      (leftElbow.score || 0) < minConfidence ||
      (rightElbow.score || 0) < minConfidence ||
      (leftWrist.score || 0) < minConfidence ||
      (rightWrist.score || 0) < minConfidence) {
    return issues;
  }

  // Calculate arm angles
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  // Check if arms are fully extended
  if (leftArmAngle < 160) {
    issues.push({
      id: 'lockout_left_arm_not_extended',
      phase: JerkPhase.LOCKOUT,
      message: 'Fully extend left arm overhead',
      severity: FormIssueSeverity.HIGH,
      bodyPart: 'left_arm'
    });
  }

  if (rightArmAngle < 160) {
    issues.push({
      id: 'lockout_right_arm_not_extended',
      phase: JerkPhase.LOCKOUT,
      message: 'Fully extend right arm overhead',
      severity: FormIssueSeverity.HIGH,
      bodyPart: 'right_arm'
    });
  }

  // Check if wrists are aligned (should be at similar heights)
  const wristHeightDifference = Math.abs(leftWrist.y - rightWrist.y);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  if (wristHeightDifference > shoulderWidth * 0.1) {
    issues.push({
      id: 'lockout_uneven_wrists',
      phase: JerkPhase.LOCKOUT,
      message: 'Keep wrists at the same height',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'wrists'
    });
  }

  // Check if arms are vertical
  const leftArmVerticalAngle = Math.abs(
    Math.atan2(leftWrist.x - leftShoulder.x, leftShoulder.y - leftWrist.y) * (180 / Math.PI)
  );

  const rightArmVerticalAngle = Math.abs(
    Math.atan2(rightWrist.x - rightShoulder.x, rightShoulder.y - rightWrist.y) * (180 / Math.PI)
  );

  if (leftArmVerticalAngle > 15) {
    issues.push({
      id: 'lockout_left_arm_not_vertical',
      phase: JerkPhase.LOCKOUT,
      message: 'Position left arm more vertically',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'left_arm'
    });
  }

  if (rightArmVerticalAngle > 15) {
    issues.push({
      id: 'lockout_right_arm_not_vertical',
      phase: JerkPhase.LOCKOUT,
      message: 'Position right arm more vertically',
      severity: FormIssueSeverity.MODERATE,
      bodyPart: 'right_arm'
    });
  }

  return issues;
};

/**
 * Analyze form for the current pose and phase
 * @param pose Current pose
 * @param currentPhase Current phase of the exercise
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Form analysis result
 */
export const analyzeForm = (
  pose: Pose,
  currentPhase: JerkPhase,
  minConfidence: number = 0.3
): FormAnalysisResult => {
  let issues: FormIssue[] = [];

  // Analyze form based on current phase
  switch (currentPhase) {
    case JerkPhase.RACK:
      issues = analyzeRackPosition(pose, minConfidence);
      break;
    case JerkPhase.DIP:
      issues = analyzeDipPhase(pose, minConfidence);
      break;
    case JerkPhase.DRIVE:
      issues = analyzeDrivePhase(pose, minConfidence);
      break;
    case JerkPhase.LOCKOUT:
      issues = analyzeLockoutPhase(pose, minConfidence);
      break;
    default:
      // No analysis for unknown phase
      break;
  }

  // Calculate overall score (100 - deductions for each issue)
  let overallScore = 100;

  issues.forEach(issue => {
    switch (issue.severity) {
      case FormIssueSeverity.LOW:
        overallScore -= 5;
        break;
      case FormIssueSeverity.MODERATE:
        overallScore -= 10;
        break;
      case FormIssueSeverity.HIGH:
        overallScore -= 20;
        break;
    }
  });

  // Ensure score is between 0 and 100
  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    issues,
    overallScore,
    timestamp: Date.now()
  };
};
