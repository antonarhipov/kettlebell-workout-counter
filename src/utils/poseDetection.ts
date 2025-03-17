import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { Pose, KeyPoint } from '../types';

// Initialize TensorFlow.js
export const initializeTF = async (): Promise<void> => {
  try {
    // Try to use WebGL backend first for better performance
    await tf.setBackend('webgl');
    console.log('Using WebGL backend');
  } catch (error) {
    console.warn('WebGL backend failed, falling back to CPU', error);
    await tf.setBackend('cpu');
    console.log('Using CPU backend');
  }

  await tf.ready();
  console.log('TensorFlow.js initialized successfully');
};

// Create a detector based on the specified model
export const createDetector = async (
  model: 'movenet' | 'posenet' = 'movenet'
): Promise<poseDetection.PoseDetector> => {
  try {
    console.log(`Creating ${model} detector...`);
    let detector: poseDetection.PoseDetector;

    if (model === 'movenet') {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        trackerType: poseDetection.TrackerType.BoundingBox,
      };
      console.log('MoveNet detector config:', detectorConfig);
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
    } else {
      const detectorConfig = {
        architecture: 'MobileNetV1' as const,
        outputStride: 16 as const,
        inputResolution: { width: 640, height: 480 },
        multiplier: 0.75 as const,
      };
      console.log('PoseNet detector config:', detectorConfig);
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.PoseNet,
        detectorConfig
      );
    }

    console.log(`${model} detector created successfully`);
    return detector;
  } catch (error) {
    console.error(`Error creating ${model} detector:`, error);
    throw error;
  }
};

// Detect poses in a video frame
export const detectPose = async (
  detector: poseDetection.PoseDetector,
  video: HTMLVideoElement
): Promise<poseDetection.Pose[]> => {
  if (!detector || !video) return [];

  try {
    const poses = await detector.estimatePoses(video);
    return poses;
  } catch (error) {
    console.error('Error detecting pose:', error);
    return [];
  }
};

// Get specific keypoints by name
export const getKeypoint = (pose: poseDetection.Pose, keypointName: string) => {
  if (!pose || !pose.keypoints) return null;
  return pose.keypoints.find(keypoint => keypoint.name === keypointName);
};

// Calculate the angle between three points
export const calculateAngle = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
};

/**
 * Apply a moving average filter to smooth keypoint positions
 * @param currentKeypoint The current keypoint to smooth
 * @param previousKeypoints Array of previous keypoints for the same body part
 * @param smoothingFactor Weight given to previous keypoints (0-1)
 * @returns Smoothed keypoint
 */
export const smoothKeypoint = (
  currentKeypoint: KeyPoint,
  previousKeypoints: KeyPoint[],
  smoothingFactor: number = 0.5
): KeyPoint => {
  // If no previous keypoints or smoothing factor is 0, return current keypoint
  if (!previousKeypoints.length || smoothingFactor <= 0) {
    return { ...currentKeypoint };
  }

  // Ensure smoothing factor is between 0 and 1
  const factor = Math.max(0, Math.min(1, smoothingFactor));

  // Calculate average of previous keypoints
  const sumX = previousKeypoints.reduce((sum, kp) => sum + kp.x, 0);
  const sumY = previousKeypoints.reduce((sum, kp) => sum + kp.y, 0);
  const avgX = sumX / previousKeypoints.length;
  const avgY = sumY / previousKeypoints.length;

  // Apply weighted average
  const smoothedX = currentKeypoint.x * (1 - factor) + avgX * factor;
  const smoothedY = currentKeypoint.y * (1 - factor) + avgY * factor;

  return {
    ...currentKeypoint,
    x: smoothedX,
    y: smoothedY
  };
};

/**
 * Apply confidence-weighted smoothing to a keypoint
 * @param currentKeypoint The current keypoint to smooth
 * @param previousKeypoints Array of previous keypoints for the same body part
 * @param smoothingFactor Base smoothing factor (0-1)
 * @param minConfidence Minimum confidence threshold
 * @returns Smoothed keypoint with confidence-weighted position
 */
export const confidenceWeightedSmoothKeypoint = (
  currentKeypoint: KeyPoint,
  previousKeypoints: KeyPoint[],
  smoothingFactor: number = 0.5,
  minConfidence: number = 0.3
): KeyPoint => {
  // If no previous keypoints or smoothing factor is 0, return current keypoint
  if (!previousKeypoints.length || smoothingFactor <= 0) {
    return { ...currentKeypoint };
  }

  // Filter previous keypoints by confidence
  const confidentKeypoints = previousKeypoints.filter(
    kp => kp.score !== undefined && kp.score >= minConfidence
  );

  if (!confidentKeypoints.length) {
    return { ...currentKeypoint };
  }

  // Calculate confidence-weighted average
  let totalWeight = 0;
  let weightedSumX = 0;
  let weightedSumY = 0;

  confidentKeypoints.forEach(kp => {
    const weight = kp.score || minConfidence;
    totalWeight += weight;
    weightedSumX += kp.x * weight;
    weightedSumY += kp.y * weight;
  });

  // Add current keypoint with its confidence
  const currentWeight = currentKeypoint.score || minConfidence;
  totalWeight += currentWeight;
  weightedSumX += currentKeypoint.x * currentWeight;
  weightedSumY += currentKeypoint.y * currentWeight;

  // Calculate weighted average
  const avgX = weightedSumX / totalWeight;
  const avgY = weightedSumY / totalWeight;

  // Apply smoothing factor
  const factor = Math.max(0, Math.min(1, smoothingFactor));
  const smoothedX = currentKeypoint.x * (1 - factor) + avgX * factor;
  const smoothedY = currentKeypoint.y * (1 - factor) + avgY * factor;

  return {
    ...currentKeypoint,
    x: smoothedX,
    y: smoothedY
  };
};

/**
 * Smooth an entire pose using a buffer of previous poses
 * @param currentPose The current pose to smooth
 * @param previousPoses Array of previous poses
 * @param smoothingFactor Weight given to previous poses (0-1)
 * @param useConfidenceWeighting Whether to use confidence-weighted smoothing
 * @param minConfidence Minimum confidence threshold for keypoints
 * @returns Smoothed pose
 */
export const smoothPose = (
  currentPose: Pose,
  previousPoses: Pose[],
  smoothingFactor: number = 0.5,
  useConfidenceWeighting: boolean = true,
  minConfidence: number = 0.3
): Pose => {
  // If no previous poses or no keypoints in current pose, return current pose
  if (!previousPoses.length || !currentPose.keypoints || currentPose.keypoints.length === 0) {
    return { ...currentPose };
  }

  // Smooth each keypoint in the pose
  const smoothedKeypoints = currentPose.keypoints.map(keypoint => {
    // Find corresponding keypoints in previous poses
    const previousKeypoints = previousPoses
      .map(pose => pose.keypoints.find(kp => kp.name === keypoint.name))
      .filter((kp): kp is KeyPoint => kp !== undefined);

    // Apply appropriate smoothing method
    if (useConfidenceWeighting) {
      return confidenceWeightedSmoothKeypoint(
        keypoint,
        previousKeypoints,
        smoothingFactor,
        minConfidence
      );
    } else {
      return smoothKeypoint(keypoint, previousKeypoints, smoothingFactor);
    }
  });

  return {
    ...currentPose,
    keypoints: smoothedKeypoints
  };
};
