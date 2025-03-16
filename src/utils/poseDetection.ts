import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { Pose } from '../types';

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
