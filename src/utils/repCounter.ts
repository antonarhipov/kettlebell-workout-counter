import { Pose, RepCounterConfig } from '../types';
import { getKeypoint, calculateAngle } from './poseDetection';

// State for tracking kettlebell jerk movements
interface JerkState {
  isUp: boolean;
  confidence: number;
  lastPosition: number;
  repCount: number;
  lastRepTime: number;
}

// Initialize the jerk state
const initialJerkState: JerkState = {
  isUp: false,
  confidence: 0,
  lastPosition: 0,
  repCount: 0,
  lastRepTime: 0,
};

let jerkState: JerkState = { ...initialJerkState };

// Reset the counter
export const resetCounter = (): void => {
  jerkState = { ...initialJerkState };
};

// Get the current rep count
export const getRepCount = (): number => {
  return jerkState.repCount;
};

/**
 * Analyze pose to detect kettlebell jerk movements and count repetitions
 * 
 * A kettlebell jerk involves:
 * 1. Starting position with kettlebell at shoulder height
 * 2. Dip by bending knees slightly
 * 3. Explosive extension to drive kettlebell overhead
 * 4. Return to rack position at shoulder
 */
export const analyzeJerkMovement = (
  pose: Pose,
  config: RepCounterConfig
): number => {
  if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
    return jerkState.repCount;
  }

  // Get relevant keypoints
  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');
  
  // Ensure we have the necessary keypoints with good confidence
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) {
    return jerkState.repCount;
  }
  
  // Check confidence scores
  const confidenceThreshold = config.minConfidence || 0.3;
  if ((leftShoulder.score || 0) < confidenceThreshold ||
      (rightShoulder.score || 0) < confidenceThreshold ||
      (leftElbow.score || 0) < confidenceThreshold ||
      (rightElbow.score || 0) < confidenceThreshold ||
      (leftWrist.score || 0) < confidenceThreshold ||
      (rightWrist.score || 0) < confidenceThreshold) {
    return jerkState.repCount;
  }
  
  // Determine which arm is holding the kettlebell (assume it's the one with the wrist higher)
  const isLeftArm = leftWrist.y < rightWrist.y;
  
  const shoulder = isLeftArm ? leftShoulder : rightShoulder;
  const elbow = isLeftArm ? leftElbow : rightElbow;
  const wrist = isLeftArm ? leftWrist : rightWrist;
  
  // Calculate arm angle
  const armAngle = calculateAngle(shoulder, elbow, wrist);
  
  // Calculate vertical position of wrist relative to shoulder
  // In screen coordinates, y increases downward, so smaller y means higher position
  const wristHeight = shoulder.y - wrist.y;
  
  // Determine if the kettlebell is in the overhead position
  // Positive wristHeight means wrist is above shoulder
  const isOverhead = wristHeight > config.repThreshold && armAngle > 150;
  
  // Track state changes to count reps
  if (isOverhead && !jerkState.isUp) {
    // Transition from down to up position
    jerkState.isUp = true;
    
    // Avoid counting too rapid movements (must be at least 500ms since last rep)
    const now = Date.now();
    if (now - jerkState.lastRepTime > 500) {
      jerkState.repCount += 1;
      jerkState.lastRepTime = now;
    }
  } else if (!isOverhead && jerkState.isUp) {
    // Transition from up to down position
    jerkState.isUp = false;
  }
  
  // Update last position
  jerkState.lastPosition = wristHeight;
  
  return jerkState.repCount;
};

// Get detailed information about the current jerk state
export const getJerkInfo = (): JerkState => {
  return { ...jerkState };
};
