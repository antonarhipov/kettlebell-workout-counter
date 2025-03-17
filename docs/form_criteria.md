# Kettlebell Jerk Form Criteria

This document outlines the criteria used for analyzing form during each phase of the kettlebell jerk exercise. These criteria are used by the form analysis module to provide real-time feedback to users.

## Rack Position

The rack position is the starting position for the kettlebell jerk. The kettlebells should be held at shoulder height with elbows close to the body.

### Criteria:

1. **Elbow Position**: Elbows should be close to the body, not flared out.
   - Measurement: Distance between elbows and hips should be less than 40% of shoulder width.
   - Feedback: "Keep elbows closer to your body" if elbows are too far out.

2. **Wrist Height**: Wrists should be at approximately shoulder height.
   - Measurement: Vertical distance between wrists and shoulders should be less than 20% of shoulder width.
   - Feedback: "Adjust kettlebell to shoulder height" if wrists are too high or too low.

## Dip Phase

The dip phase involves a slight bend in the knees to prepare for the explosive movement.

### Criteria:

1. **Dip Depth**: The dip should be a quarter squat, not too shallow or too deep.
   - Measurement: Knee angle should be between 120° and 160°.
   - Feedback: "Deepen your dip for more power" if knee angle > 160°.
   - Feedback: "Dip is too deep, aim for quarter squat" if knee angle < 120°.

2. **Knee Alignment**: Knees should be evenly bent.
   - Measurement: Difference between left and right knee angles should be less than 15°.
   - Feedback: "Keep knees evenly bent" if difference > 15°.

3. **Torso Position**: Torso should remain upright during the dip.
   - Measurement: Angle between torso and vertical should be less than 15° (torso angle > 75°).
   - Feedback: "Keep torso more upright" if leaning forward too much.

## Drive Phase

The drive phase is the explosive extension of the legs and arms to propel the kettlebells upward.

### Criteria:

1. **Arm Extension**: Arms should extend evenly.
   - Measurement: Difference between left and right arm angles should be less than 20°.
   - Feedback: "Extend arms evenly" if difference > 20°.

2. **Leg Extension**: Legs should fully extend for maximum power.
   - Measurement: Knee angle should be greater than 160°.
   - Feedback: "Fully extend legs for maximum power" if knee angle < 160°.

## Lockout Phase

The lockout phase is the final position with arms fully extended overhead and shoulders elevated.

### Criteria:

1. **Arm Extension**: Arms should be fully extended overhead.
   - Measurement: Arm angle (between shoulder, elbow, and wrist) should be greater than 160°.
   - Feedback: "Fully extend arm overhead" if arm angle < 160°.

2. **Wrist Alignment**: Wrists should be at the same height.
   - Measurement: Vertical difference between left and right wrists should be less than 10% of shoulder width.
   - Feedback: "Keep wrists at the same height" if difference > 10% of shoulder width.

3. **Arm Verticality**: Arms should be vertical.
   - Measurement: Horizontal deviation from vertical should be less than 15°.
   - Feedback: "Position arm more vertically" if deviation > 15°.

## Overall Form Score

The overall form score is calculated based on the number and severity of form issues detected:

- Starting score: 100
- Low severity issue: -5 points
- Moderate severity issue: -10 points
- High severity issue: -20 points

The final score is capped between 0 and 100.

## Implementation Details

The form analysis is implemented in the `formAnalysis.ts` file, which contains functions for analyzing form in each phase of the exercise:

- `analyzeRackPosition`: Analyzes form during the rack position
- `analyzeDipPhase`: Analyzes form during the dip phase
- `analyzeDrivePhase`: Analyzes form during the drive phase
- `analyzeLockoutPhase`: Analyzes form during the lockout phase
- `analyzeForm`: Main function that calls the appropriate phase-specific function based on the current phase

The form analysis results are displayed to the user through the `FormFeedbackComponent`, which shows:

1. The overall form score
2. The current phase of the exercise
3. A list of form issues with their severity
4. A "Good form!" message if no issues are detected