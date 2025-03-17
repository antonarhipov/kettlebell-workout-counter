import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pose } from '../../types';
import { JerkPhase } from '../../utils/jerkFSM';
import { FormAnalysisResult } from '../../utils/formAnalysis';
import FormFeedbackComponent from '../FormFeedback/FormFeedbackComponent';
import { Spin, message } from 'antd';
import { 
  initializePoseDetection, 
  detectPoses, 
  disposePoseDetection,
  isPoseDetectionInitialized
} from '../../services/poseDetectionService';
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
  const requestRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [detectionInitialized, setDetectionInitialized] = useState<boolean>(false);
  // Performance metrics
  const [fps, setFps] = useState<number>(0);
  const fpsCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(Date.now());
  // Form analysis state
  const [formAnalysis, setFormAnalysis] = useState<FormAnalysisResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<JerkPhase>(JerkPhase.UNKNOWN);

  // Initialize pose detection
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if detection is already initialized
        if (isPoseDetectionInitialized()) {
          setDetectionInitialized(true);
          setLoading(false);
          return;
        }

        // Initialize pose detection
        console.log(`Initializing pose detection with ${modelType} model...`);
        await initializePoseDetection(
          modelType,
          (success) => {
            setDetectionInitialized(success);
            setLoading(false);
            if (success) {
              message.success('Pose detection initialized successfully');
            } else {
              setError('Failed to initialize pose detection. Please try refreshing the page.');
              message.error('Failed to initialize pose detection');
            }
          },
          (errorMsg) => {
            console.error('Error initializing pose detection:', errorMsg);
            setError(`Failed to initialize pose detection: ${errorMsg}`);
            setLoading(false);
            message.error('Failed to initialize pose detection');
          }
        );
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
      disposePoseDetection();
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
        ctx.arc(keypoint.x, keypoint.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#f43ae3';
        ctx.fill();
        ctx.strokeStyle = '#b50ae4';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw keypoint name
        if (keypoint.name) {
          // Add text background for better visibility
          const textWidth = ctx.measureText(keypoint.name).width;
          ctx.fillStyle = 'rgb(83,181,2)';
          ctx.fillRect(keypoint.x + 8, keypoint.y - 12, textWidth + 4, 16);

          // Draw text with larger font
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y);
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
        ctx.strokeStyle = '#1374e4';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
  }, [minConfidence]);

  // Update canvas when pose changes
  useEffect(() => {
    drawPose(currentPose);
  }, [currentPose, drawPose]);

  // Update FPS counter
  const updateFPS = useCallback(() => {
    fpsCountRef.current++;
    const now = Date.now();
    const elapsed = now - lastFpsUpdateRef.current;

    if (elapsed >= 1000) { // Update FPS every second
      setFps(Math.round((fpsCountRef.current * 1000) / elapsed));
      fpsCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, []);

  // Run pose detection loop
  useEffect(() => {
    if (!isActive || loading || error || !detectionInitialized || !videoRef || !videoRef.current) {
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
    const runDetection = async () => {
      try {
        if (!videoElement) return;

        // Ensure video is ready
        if (videoElement.readyState < 2) {
          requestRef.current = requestAnimationFrame(runDetection);
          return;
        }

        // Detect poses directly in the main thread
        await detectPoses(
          videoElement,
          {
            minConfidence,
            repThreshold,
            smoothingEnabled,
            smoothingFactor,
            useConfidenceWeighting,
            poseBufferSize
          },
          (pose, repCount, phase, analysis) => {
            // Handle pose detection result
            setCurrentPose(pose);
            onPoseDetected(pose);
            onRepCountChange(repCount);
            setCurrentPhase(phase);
            setFormAnalysis(analysis);

            // Draw pose
            drawPose(pose);
          },
          () => {
            // Handle no poses detected
            console.log('No poses detected');
          },
          (errorMsg) => {
            // Handle error
            console.error('Error in pose detection:', errorMsg);
            message.error('Error in pose detection');
          }
        );

        // Update FPS counter
        updateFPS();

        // Continue detection loop
        requestRef.current = requestAnimationFrame(runDetection);
      } catch (err) {
        console.error('Error in pose detection loop:', err);
        message.error('Error in pose detection');

        // Continue detection loop even after error
        requestRef.current = requestAnimationFrame(runDetection);
      }
    };

    // Start detection loop
    requestRef.current = requestAnimationFrame(runDetection);

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
    detectionInitialized,
    videoRef, 
    onPoseDetected, 
    onRepCountChange, 
    minConfidence, 
    repThreshold, 
    drawPose,
    smoothingEnabled,
    smoothingFactor,
    useConfidenceWeighting,
    poseBufferSize,
    updateFPS
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
        <>
          <div className="form-feedback-wrapper">
            <FormFeedbackComponent 
              formAnalysis={formAnalysis}
              currentPhase={currentPhase}
            />
          </div>

          <div className="performance-metrics">
            <span className="fps-counter">{fps} FPS</span>
            <span className="detection-status">
              Detection: {detectionInitialized ? 'Active' : 'Inactive'}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PoseDetectionComponent;
