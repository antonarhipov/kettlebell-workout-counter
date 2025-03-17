import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { Pose } from '../../types';
import { initializeTF, createDetector, smoothPose } from '../../utils/poseDetection';
import { processJerkMovement, getJerkFSMState, JerkPhase } from '../../utils/jerkFSM';
import { analyzeForm, FormAnalysisResult } from '../../utils/formAnalysis';
import FormFeedbackComponent from '../FormFeedback/FormFeedbackComponent';
import { Spin, message } from 'antd';
import './PoseDetectionComponent.css';

interface PoseDetectionComponentProps {
  videoRef: React.RefObject<HTMLVideoElement> | null;
  isActive: boolean;
  modelType: 'movenet' | 'posenet';
  minConfidence: number;
  repThreshold: number;
  onPoseDetected: (pose: Pose | null) => void;
  onRepCountChange: (count: number) => void;
  // Optional smoothing parameters
  smoothingEnabled?: boolean;
  smoothingFactor?: number;
  useConfidenceWeighting?: boolean;
  poseBufferSize?: number;
}

const PoseDetectionComponent: React.FC<PoseDetectionComponentProps> = ({
  videoRef,
  isActive,
  modelType,
  minConfidence,
  repThreshold,
  onPoseDetected,
  onRepCountChange,
  // Default values for smoothing parameters
  smoothingEnabled = true,
  smoothingFactor = 0.5,
  useConfidenceWeighting = true,
  poseBufferSize = 5
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const requestRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [tfInitialized, setTfInitialized] = useState<boolean>(false);
  // Buffer for storing previous poses for smoothing
  const [previousPoses, setPreviousPoses] = useState<Pose[]>([]);
  // Form analysis state
  const [formAnalysis, setFormAnalysis] = useState<FormAnalysisResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<JerkPhase>(JerkPhase.UNKNOWN);

  // Initialize TensorFlow.js and pose detector
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize TensorFlow.js
        console.log('Starting TensorFlow.js initialization...');
        await initializeTF();
        setTfInitialized(true);

        // Create the detector
        console.log(`Creating ${modelType} detector...`);
        const detector = await createDetector(modelType);
        detectorRef.current = detector;

        setLoading(false);
        message.success('Pose detection initialized successfully');
      } catch (err) {
        console.error('Error initializing pose detection:', err);
        setError('Failed to initialize pose detection. Please try refreshing the page.');
        setLoading(false);
        message.error('Failed to initialize pose detection');
      }
    };

    init();

    return () => {
      // Clean up
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [modelType]);

  // Draw pose keypoints and connections on canvas
  const drawPose = useCallback((pose: Pose | null) => {
    if (!canvasRef.current || !pose) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw keypoints
    pose.keypoints.forEach(keypoint => {
      if (keypoint.score && keypoint.score > minConfidence) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'aqua';
        ctx.fill();

        // Draw keypoint name
        if (keypoint.name) {
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(keypoint.name, keypoint.x + 8, keypoint.y);
        }
      }
    });

    // Draw connections between keypoints (stick figure)
    const connections = [
      ['nose', 'left_eye'], ['nose', 'right_eye'],
      ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
      ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];

    connections.forEach(([from, to]) => {
      const fromKeypoint = pose.keypoints.find(kp => kp.name === from);
      const toKeypoint = pose.keypoints.find(kp => kp.name === to);

      if (fromKeypoint && toKeypoint && 
          fromKeypoint.score && toKeypoint.score && 
          fromKeypoint.score > minConfidence && toKeypoint.score > minConfidence) {
        ctx.beginPath();
        ctx.moveTo(fromKeypoint.x, fromKeypoint.y);
        ctx.lineTo(toKeypoint.x, toKeypoint.y);
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [minConfidence]);

  // Update canvas when pose changes
  useEffect(() => {
    drawPose(currentPose);
  }, [currentPose, drawPose]);

  // Run pose detection loop
  useEffect(() => {
    if (!isActive || loading || error || !detectorRef.current || !videoRef || !videoRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement || videoElement.readyState < 2) {
      // Video not ready yet
      return;
    }

    // Set canvas dimensions to match video
    if (canvasRef.current) {
      canvasRef.current.width = videoElement.videoWidth || videoElement.clientWidth;
      canvasRef.current.height = videoElement.videoHeight || videoElement.clientHeight;
    }

    // Detect poses
    const detectPoses = async () => {
      try {
        if (!detectorRef.current || !videoElement) return;

        // Ensure video is ready
        if (videoElement.readyState < 2) {
          requestRef.current = requestAnimationFrame(detectPoses);
          return;
        }

        // Detect poses
        const poses = await detectorRef.current.estimatePoses(videoElement);

        if (poses && poses.length > 0) {
          let pose = poses[0] as Pose;

          // Apply smoothing if enabled
          if (smoothingEnabled && previousPoses.length > 0) {
            pose = smoothPose(
              pose,
              previousPoses,
              smoothingFactor,
              useConfidenceWeighting,
              minConfidence
            );
          }

          // Update previous poses buffer
          setPreviousPoses(prevPoses => {
            const newPoses = [...prevPoses, pose];
            // Keep only the most recent poses based on buffer size
            return newPoses.slice(-poseBufferSize);
          });

          setCurrentPose(pose);
          onPoseDetected(pose);

          // Process movement with FSM and count reps
          const repCount = processJerkMovement(pose, {
            minConfidence,
            rackHeightThreshold: 0.1,
            dipDepthThreshold: 15,
            lockoutHeightThreshold: repThreshold,
            lockoutAngleThreshold: 160,
            minRepDuration: 500
          });

          onRepCountChange(repCount);

          // Get current phase from FSM
          const fsmState = getJerkFSMState();
          setCurrentPhase(fsmState.currentPhase);

          // Analyze form based on current phase
          const analysis = analyzeForm(pose, fsmState.currentPhase, minConfidence);
          setFormAnalysis(analysis);

          // Draw pose
          drawPose(pose);
        } else {
          console.log('No poses detected');
        }

        // Continue detection loop
        requestRef.current = requestAnimationFrame(detectPoses);
      } catch (err) {
        console.error('Error in pose detection loop:', err);
        message.error('Error in pose detection');
      }
    };

    // Start detection loop
    requestRef.current = requestAnimationFrame(detectPoses);

    // Clean up
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [
    isActive, 
    loading, 
    error, 
    videoRef, 
    onPoseDetected, 
    onRepCountChange, 
    minConfidence, 
    repThreshold, 
    drawPose,
    smoothingEnabled,
    smoothingFactor,
    useConfidenceWeighting,
    poseBufferSize
  ]);

  return (
    <div className="pose-detection-container">
      {loading && (
        <div className="loading-container">
          <Spin tip="Initializing pose detection..." />
        </div>
      )}

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      <canvas 
        ref={canvasRef}
        className="pose-canvas"
      />

      {isActive && (
        <div className="form-feedback-wrapper">
          <FormFeedbackComponent 
            formAnalysis={formAnalysis}
            currentPhase={currentPhase}
          />
        </div>
      )}
    </div>
  );
};

export default PoseDetectionComponent;
