// Types for pose detection
export interface KeyPoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: KeyPoint[];
  score?: number;
}

// Types for rep counting
export interface RepCounterConfig {
  minConfidence: number;
  repThreshold: number;
}

// Types for exercise data
export interface ExerciseData {
  exerciseType: string;
  reps: number;
  duration: number;
  timestamp: Date;
}

// Types for user settings
export interface UserSettings {
  cameraId: string;
  detectionModel: 'movenet' | 'posenet';
  minConfidence: number;
  repThreshold: number;
}
