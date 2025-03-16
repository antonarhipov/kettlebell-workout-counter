import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize TensorFlow.js
const initializeTensorFlow = async () => {
  try {
    // Set the backend to WebGL for better performance
    await tf.setBackend('webgl');
    console.log('Using WebGL backend');
  } catch (error) {
    console.warn('WebGL backend not available, falling back to CPU', error);
    await tf.setBackend('cpu');
    console.log('Using CPU backend');
  }
  
  await tf.ready();
  console.log('TensorFlow.js initialized successfully');
};

// Initialize TensorFlow.js before rendering the app
initializeTensorFlow().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    <React.StrictMode>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
