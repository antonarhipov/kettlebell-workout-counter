import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button, Select, Space, message } from 'antd';
import { CameraOutlined, ReloadOutlined } from '@ant-design/icons';
import './CameraComponent.css';

interface CameraComponentProps {
  onVideoRef: (videoElement: HTMLVideoElement | null) => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onVideoRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Get available camera devices
  const getCameraDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      // Select the first device by default if none is selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting camera devices:', error);
      message.error('Failed to access camera devices');
    }
  }, [selectedDeviceId]);

  // Initialize camera access
  useEffect(() => {
    getCameraDevices();
  }, [getCameraDevices]);

  // Pass the video element to parent when the ref is available
  useEffect(() => {
    if (videoRef.current) {
      onVideoRef(videoRef.current);
    }
    
    return () => {
      // Clean up when component unmounts
      onVideoRef(null);
    };
  }, [onVideoRef]);

  // Start the camera stream
  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      setIsStreaming(true);
      
      message.success('Camera started successfully');
    } catch (error) {
      console.error('Error starting camera:', error);
      message.error('Failed to start camera');
    }
  };

  // Stop the camera stream
  const stopCamera = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      
      message.info('Camera stopped');
    } catch (error) {
      console.error('Error stopping camera:', error);
      message.error('Failed to stop camera');
    }
  };

  // Handle device selection change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    
    // Restart camera with new device if already streaming
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 500); // Short delay to ensure previous stream is fully stopped
    }
  };

  // Refresh device list
  const refreshDevices = () => {
    getCameraDevices();
    message.info('Camera list refreshed');
  };

  return (
    <div className="camera-component">
      <div className="camera-container">
        <video 
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />
      </div>
      
      <div className="camera-controls">
        <Space>
          <Select
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            placeholder="Select camera"
            style={{ width: 200 }}
          >
            {devices.map(device => (
              <Select.Option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </Select.Option>
            ))}
          </Select>
          
          <Button 
            type="primary"
            icon={<CameraOutlined />}
            onClick={isStreaming ? stopCamera : startCamera}
          >
            {isStreaming ? 'Stop Camera' : 'Start Camera'}
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshDevices}
          >
            Refresh
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default CameraComponent;
