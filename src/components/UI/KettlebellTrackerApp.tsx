import React, { useState, useRef, MutableRefObject, useEffect } from 'react';
import { Layout, Typography, Tabs } from 'antd';
import { InfoCircleOutlined, SettingOutlined, HistoryOutlined, CameraOutlined } from '@ant-design/icons';
import CameraComponent from '../Camera/CameraComponent';
import PoseDetectionComponent from '../PoseDetection/PoseDetectionComponent';
import RepCounterComponent from '../RepCounter/RepCounterComponent';
import SettingsComponent from '../Settings/SettingsComponent';
import { Pose, UserSettings } from '../../types';
import { resetJerkFSM } from '../../utils/jerkFSM';
import { loadSettings, saveSettings } from '../../services/settingsService';
import './KettlebellTrackerApp.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

interface KettlebellTrackerAppProps {
  // Add any props if needed
}

const KettlebellTrackerApp: React.FC<KettlebellTrackerAppProps> = () => {
  // Create a properly typed ref for the video element
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [repCount, setRepCount] = useState<number>(0);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);

  // Settings state
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [minConfidence, setMinConfidence] = useState<number>(settings.minConfidence);
  const [repThreshold, setRepThreshold] = useState<number>(settings.repThreshold);
  const [modelType, setModelType] = useState<'movenet' | 'posenet'>(settings.detectionModel);
  const [smoothingEnabled, setSmoothingEnabled] = useState<boolean>(settings.smoothingEnabled || false);
  const [smoothingFactor, setSmoothingFactor] = useState<number>(settings.smoothingFactor || 0.5);
  const [useConfidenceWeighting, setUseConfidenceWeighting] = useState<boolean>(settings.useConfidenceWeighting || true);
  const [poseBufferSize, setPoseBufferSize] = useState<number>(settings.poseBufferSize || 5);

  // Load settings on component mount
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setMinConfidence(loadedSettings.minConfidence);
    setRepThreshold(loadedSettings.repThreshold);
    setModelType(loadedSettings.detectionModel);
    setSmoothingEnabled(loadedSettings.smoothingEnabled || false);
    setSmoothingFactor(loadedSettings.smoothingFactor || 0.5);
    setUseConfidenceWeighting(loadedSettings.useConfidenceWeighting || true);
    setPoseBufferSize(loadedSettings.poseBufferSize || 5);
  }, []);

  // Handle video reference from camera component
  const handleVideoRef = (element: HTMLVideoElement | null) => {
    if (element) {
      videoElementRef.current = element;
      setVideoReady(true);
    } else {
      setVideoReady(false);
    }
  };

  // Toggle active state for pose detection
  const handleToggleActive = () => {
    setIsActive(!isActive);
  };

  // Reset repetition counter
  const handleResetCounter = () => {
    resetJerkFSM();
    setRepCount(0);
  };

  // Handle pose detection
  const handlePoseDetected = (pose: Pose | null) => {
    setCurrentPose(pose);
  };

  // Handle rep count change
  const handleRepCountChange = (count: number) => {
    setRepCount(count);
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setMinConfidence(newSettings.minConfidence);
    setRepThreshold(newSettings.repThreshold);
    setModelType(newSettings.detectionModel);
    setSmoothingEnabled(newSettings.smoothingEnabled || false);
    setSmoothingFactor(newSettings.smoothingFactor || 0.5);
    setUseConfidenceWeighting(newSettings.useConfidenceWeighting || true);
    setPoseBufferSize(newSettings.poseBufferSize || 5);

    // Save settings to localStorage
    saveSettings(newSettings);
  };

  return (
    <Layout className="kettlebell-tracker-layout">
      <Header className="app-header">
        <div className="header-content">
          <Title level={3} className="app-title">Kettlebell Jerk Tracker</Title>
        </div>
      </Header>

      <Content className="app-content">
        <Tabs defaultActiveKey="1" className="main-tabs">
          <TabPane 
            tab={
              <span>
                <CameraOutlined />
                Tracking
              </span>
            } 
            key="1"
          >
            <div className="tracking-container">
              {/* Main content area with video and pose visualization */}
              <div className="main-content-area">
                <div className="video-pose-container">
                  {/* Video container */}
                  <div className="video-container">
                    <CameraComponent onVideoRef={handleVideoRef} />
                  </div>

                  {/* Pose visualization container */}
                  <div className="pose-container">
                    {videoReady && videoElementRef.current && (
                      <PoseDetectionComponent
                        videoRef={videoElementRef as MutableRefObject<HTMLVideoElement>}
                        isActive={isActive}
                        modelType={modelType}
                        minConfidence={minConfidence}
                        repThreshold={repThreshold}
                        onPoseDetected={handlePoseDetected}
                        onRepCountChange={handleRepCountChange}
                        smoothingEnabled={smoothingEnabled}
                        smoothingFactor={smoothingFactor}
                        useConfidenceWeighting={useConfidenceWeighting}
                        poseBufferSize={poseBufferSize}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Controls panel on the right */}
              <div className="controls-panel">
                <RepCounterComponent
                  repCount={repCount}
                  isActive={isActive}
                  onToggleActive={handleToggleActive}
                  onResetCounter={handleResetCounter}
                />
              </div>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                Settings
              </span>
            } 
            key="2"
          >
            <div className="settings-container">
              <SettingsComponent 
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <HistoryOutlined />
                History
              </span>
            } 
            key="3"
          >
            <div className="history-container">
              <h2>Workout History</h2>
              <p>View your past workouts and progress.</p>
              {/* History components will go here */}
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <InfoCircleOutlined />
                About
              </span>
            } 
            key="4"
          >
            <div className="about-container">
              <h2>About Kettlebell Jerk Tracker</h2>
              <p>
                This application uses computer vision to track kettlebell jerk exercises.
                It counts repetitions automatically by analyzing your movements through your webcam.
              </p>
              <p>
                <strong>Kettlebell Jerk Movement Phases:</strong>
              </p>
              <ol>
                <li><strong>Rack Position:</strong> Kettlebells at shoulder height, elbows close to body</li>
                <li><strong>Dip Phase:</strong> Slight bend in knees, preparing for explosive movement</li>
                <li><strong>Drive Phase:</strong> Rapid extension of legs and arms</li>
                <li><strong>Lockout:</strong> Arms fully extended overhead, shoulders elevated</li>
              </ol>
              <p>
                <strong>Privacy Note:</strong> All processing happens locally in your browser.
                No video data is uploaded to any server.
              </p>
            </div>
          </TabPane>
        </Tabs>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        Kettlebell Jerk Counter &copy; {new Date().getFullYear()} Created with React and TensorFlow.js
      </Footer>
    </Layout>
  );
};

export default KettlebellTrackerApp;
