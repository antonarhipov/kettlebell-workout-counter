import { Pose } from '../types';
import { getKeypoint, calculateAngle } from './poseDetection';

/**
 * Finite State Machine for Kettlebell Jerk Movement Detection
 * 
 * The kettlebell jerk consists of four distinct phases:
 * 1. Rack Position: Kettlebells at shoulder height, elbows close to body
 * 2. Dip Phase: Slight bend in knees, preparing for explosive movement
 * 3. Explosive Jerk: Rapid extension of legs and arms
 * 4. Lockout: Arms fully extended overhead, shoulders elevated
 */

// Movement phases for the kettlebell jerk
export enum JerkPhase {
  UNKNOWN = 'unknown',
  RACK = 'rack',
  DIP = 'dip',
  DRIVE = 'drive',
  LOCKOUT = 'lockout'
}

// Type guard to check if a phase is a specific value
export function isPhase(phase: JerkPhase, targetPhase: JerkPhase): boolean {
  return phase === targetPhase;
}

// Configuration for the jerk FSM
export interface JerkFSMConfig {
  minConfidence: number;
  rackHeightThreshold: number;    // Wrist to shoulder height ratio for rack position
  dipDepthThreshold: number;      // Knee angle change for dip detection
  lockoutHeightThreshold: number; // Wrist height above shoulder for lockout
  lockoutAngleThreshold: number;  // Minimum arm angle for lockout
  minRepDuration: number;         // Minimum time (ms) between reps
}

// Default configuration values
export const defaultJerkFSMConfig: JerkFSMConfig = {
  minConfidence: 0.3,
  rackHeightThreshold: 0.1,      // Wrists slightly below or at shoulder level
  dipDepthThreshold: 15,         // 15 degrees change in knee angle
  lockoutHeightThreshold: 50,    // Wrists at least 50px above shoulders
  lockoutAngleThreshold: 160,    // Arms nearly straight (160+ degrees)
  minRepDuration: 500            // Minimum 500ms between reps
};

// State information for the jerk FSM
export interface JerkFSMState {
  currentPhase: JerkPhase;
  previousPhase: JerkPhase;
  repCount: number;
  lastRepTime: number;
  kneeAngle: number;
  leftArmAngle: number;
  rightArmAngle: number;
  leftWristHeight: number;
  rightWristHeight: number;
  confidence: number;
  lastTransitionTime: number;
  isValidRep: boolean;
}

// Initialize the FSM state
const initialJerkFSMState: JerkFSMState = {
  currentPhase: JerkPhase.UNKNOWN,
  previousPhase: JerkPhase.UNKNOWN,
  repCount: 0,
  lastRepTime: 0,
  kneeAngle: 0,
  leftArmAngle: 0,
  rightArmAngle: 0,
  leftWristHeight: 0,
  rightWristHeight: 0,
  confidence: 0,
  lastTransitionTime: 0,
  isValidRep: false
};

// Current state of the FSM
let jerkFSMState: JerkFSMState = { ...initialJerkFSMState };

/**
 * Reset the jerk FSM state
 */
export const resetJerkFSM = (): void => {
  jerkFSMState = { ...initialJerkFSMState };
};

/**
 * Get the current jerk FSM state
 */
export const getJerkFSMState = (): JerkFSMState => {
  return { ...jerkFSMState };
};

/**
 * Get the current rep count
 */
export const getJerkRepCount = (): number => {
  return jerkFSMState.repCount;
};

/**
 * Check if keypoints have sufficient confidence
 */
const hasConfidentKeypoints = (
  pose: Pose,
  keypointNames: string[],
  minConfidence: number
): boolean => {
  if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
    return false;
  }

  for (const name of keypointNames) {
    const keypoint = getKeypoint(pose, name);
    if (!keypoint || (keypoint.score || 0) < minConfidence) {
      return false;
    }
  }

  return true;
};

/**
 * Detect rack position (kettlebells at shoulder height)
 */
const detectRackPosition = (
  pose: Pose,
  config: JerkFSMConfig
): boolean => {
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  
  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return false;
  }
  
  // In rack position, wrists should be near shoulder height
  const leftWristToShoulderDiff = Math.abs(leftWrist.y - leftShoulder.y);
  const rightWristToShoulderDiff = Math.abs(rightWrist.y - rightShoulder.y);
  
  // Wrists should be close to shoulders horizontally as well
  const leftWristToShoulderHorizDiff = Math.abs(leftWrist.x - leftShoulder.x);
  const rightWristToShoulderHorizDiff = Math.abs(rightWrist.x - rightShoulder.x);
  
  // Update state values
  jerkFSMState.leftWristHeight = leftShoulder.y - leftWrist.y;
  jerkFSMState.rightWristHeight = rightShoulder.y - rightWrist.y;
  
  return (
    leftWristToShoulderDiff < config.rackHeightThreshold * leftShoulder.y &&
    rightWristToShoulderDiff < config.rackHeightThreshold * rightShoulder.y &&
    leftWristToShoulderHorizDiff < 50 &&
    rightWristToShoulderHorizDiff < 50
  );
};

/**
 * Detect dip phase (slight knee bend)
 */
const detectDipPhase = (
  pose: Pose,
  config: JerkFSMConfig
): boolean => {
  const leftHip = getKeypoint(pose, 'left_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const leftAnkle = getKeypoint(pose, 'left_ankle');
  
  if (!leftHip || !leftKnee || !leftAnkle) {
    return false;
  }
  
  // Calculate knee angle
  const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const prevKneeAngle = jerkFSMState.kneeAngle;
  
  // Update state
  jerkFSMState.kneeAngle = kneeAngle;
  
  // Detect if knees are bending (angle decreasing)
  return (
    prevKneeAngle - kneeAngle > config.dipDepthThreshold &&
    kneeAngle < 170 // Not completely straight
  );
};

/**
 * Detect drive phase (explosive extension)
 */
const detectDrivePhase = (
  pose: Pose,
  config: JerkFSMConfig
): boolean => {
  const leftHip = getKeypoint(pose, 'left_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const leftAnkle = getKeypoint(pose, 'left_ankle');
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  
  if (!leftHip || !leftKnee || !leftAnkle || 
      !leftShoulder || !leftElbow || !leftWrist ||
      !rightShoulder || !rightElbow || !rightWrist) {
    return false;
  }
  
  // Calculate knee angle
  const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const prevKneeAngle = jerkFSMState.kneeAngle;
  
  // Calculate arm angles
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  
  // Update state
  jerkFSMState.kneeAngle = kneeAngle;
  jerkFSMState.leftArmAngle = leftArmAngle;
  jerkFSMState.rightArmAngle = rightArmAngle;
  
  // Detect if knees are extending (angle increasing) and arms are starting to extend
  return (
    kneeAngle - prevKneeAngle > 5 && // Knees extending
    kneeAngle > 160 && // Nearly straight legs
    leftArmAngle > 90 && leftArmAngle < 150 && // Arms extending but not locked
    rightArmAngle > 90 && rightArmAngle < 150
  );
};

/**
 * Detect lockout phase (arms extended overhead)
 */
const detectLockoutPhase = (
  pose: Pose,
  config: JerkFSMConfig
): boolean => {
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  
  if (!leftShoulder || !rightShoulder || 
      !leftElbow || !rightElbow || 
      !leftWrist || !rightWrist) {
    return false;
  }
  
  // Calculate arm angles
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  
  // Calculate wrist heights relative to shoulders
  const leftWristHeight = leftShoulder.y - leftWrist.y;
  const rightWristHeight = rightShoulder.y - rightWrist.y;
  
  // Calculate horizontal alignment of wrists (should be close to each other)
  const wristHorizontalDifference = Math.abs(leftWrist.x - rightWrist.x);
  
  // Calculate vertical alignment (wrists should be at similar heights)
  const wristVerticalDifference = Math.abs(leftWrist.y - rightWrist.y);
  
  // Check if wrists are aligned vertically (parallel)
  const areWristsParallel = wristVerticalDifference < 20; // Within 20px vertically
  
  // Check if arms are pointing upward (vertical)
  const isLeftArmVertical = Math.abs(leftWrist.x - leftShoulder.x) < 30; // Within 30px horizontally
  const isRightArmVertical = Math.abs(rightWrist.x - rightShoulder.x) < 30; // Within 30px horizontally
  
  // Update state
  jerkFSMState.leftArmAngle = leftArmAngle;
  jerkFSMState.rightArmAngle = rightArmAngle;
  jerkFSMState.leftWristHeight = leftWristHeight;
  jerkFSMState.rightWristHeight = rightWristHeight;
  
  // Both arms must be extended overhead, parallel, and vertically upwards
  return (
    leftArmAngle > config.lockoutAngleThreshold &&
    rightArmAngle > config.lockoutAngleThreshold &&
    leftWristHeight > config.lockoutHeightThreshold &&
    rightWristHeight > config.lockoutHeightThreshold &&
    areWristsParallel &&
    isLeftArmVertical &&
    isRightArmVertical
  );
};

/**
 * Process the current pose and update the FSM state
 */
export const processJerkMovement = (
  pose: Pose,
  config: JerkFSMConfig = defaultJerkFSMConfig
): number => {
  // Check if we have a valid pose with confident keypoints
  const requiredKeypoints = [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ];
  
  if (!hasConfidentKeypoints(pose, requiredKeypoints, config.minConfidence)) {
    return jerkFSMState.repCount;
  }
  
  // Determine current phase
  let newPhase: JerkPhase = JerkPhase.UNKNOWN;
  
  // Check for lockout first (highest priority)
  const isInLockoutPhase = detectLockoutPhase(pose, config);
  if (isInLockoutPhase) {
    newPhase = JerkPhase.LOCKOUT;
  }
  // Then check for drive phase
  else if (detectDrivePhase(pose, config)) {
    newPhase = JerkPhase.DRIVE;
  }
  // Then check for dip phase
  else if (detectDipPhase(pose, config)) {
    newPhase = JerkPhase.DIP;
  }
  // Finally check for rack position
  else if (detectRackPosition(pose, config)) {
    newPhase = JerkPhase.RACK;
  }
  
  // Store previous phase before updating
  const previousPhase: JerkPhase = jerkFSMState.currentPhase;
  
  // Update current phase in state
  jerkFSMState.previousPhase = previousPhase;
  jerkFSMState.currentPhase = newPhase;
  
  // Handle phase transitions
  const now = Date.now();
  
  // If we've transitioned to a new phase
  if (newPhase !== previousPhase) {
    jerkFSMState.lastTransitionTime = now;
    
    // Check if we've entered the lockout phase
    if (isPhase(newPhase, JerkPhase.LOCKOUT)) {
      // Make sure enough time has passed since the last rep
      if (now - jerkFSMState.lastRepTime > config.minRepDuration) {
        jerkFSMState.repCount += 1;
        jerkFSMState.lastRepTime = now;
        jerkFSMState.isValidRep = true;
      }
    } else {
      // Check for valid transitions
      switch (previousPhase) {
        case JerkPhase.RACK:
          jerkFSMState.isValidRep = isPhase(newPhase, JerkPhase.DIP);
          break;
        case JerkPhase.DIP:
          jerkFSMState.isValidRep = isPhase(newPhase, JerkPhase.DRIVE);
          break;
        case JerkPhase.DRIVE:
          jerkFSMState.isValidRep = isPhase(newPhase, JerkPhase.LOCKOUT);
          break;
        default:
          jerkFSMState.isValidRep = false;
      }
    }
  }
  
  return jerkFSMState.repCount;
};
