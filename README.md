# Kettlebell Jerk Tracker

A web application that uses computer vision to track and count kettlebell jerk exercises automatically through your webcam.

## Features

- **Automatic Rep Counting**: Uses TensorFlow.js pose detection to track your movements and count repetitions
- **Real-time Feedback**: Visual feedback on your form during exercises
- **Privacy-Focused**: All processing happens locally in your browser - no video data is uploaded to any server
- **Workout History**: Track your progress over time
- **Customizable Settings**: Adjust detection sensitivity and other parameters

## How It Works

The application uses TensorFlow.js pose detection models to track key body points during kettlebell jerk exercises:

1. **Rack Position**: Kettlebells at shoulder height, elbows close to body
2. **Dip Phase**: Slight bend in knees, preparing for explosive movement
3. **Drive Phase**: Rapid extension of legs and arms
4. **Lockout**: Arms fully extended overhead, shoulders elevated

## Technologies Used

- React with TypeScript
- TensorFlow.js for pose detection
- Ant Design for UI components

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- A modern web browser (Chrome recommended for best performance)
- A webcam

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/kettlecounter.git
   cd kettlecounter
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Allow camera access when prompted
2. Position yourself so your full body is visible in the camera
3. Click "Start Tracking" to begin
4. Perform kettlebell jerk exercises
5. The app will automatically count your repetitions

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production

## Privacy

This application processes all video data locally in your browser. No video or image data is sent to any server.