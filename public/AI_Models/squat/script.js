// DOM elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const resetBtn = document.getElementById("resetBtn");
const detectionWarning = document.getElementById("detection-warning");
const repCounter = document.getElementById("rep-counter");
const correctCounter = document.getElementById("correct-counter");
const incorrectCounter = document.getElementById("incorrect-counter");
const feedback = document.getElementById("feedback");
const depthBar = document.getElementById("depth-bar");
const depthIndicator = document.getElementById("depth-indicator");
const exitFullscreenBtn = document.getElementById("exitFullscreenBtn");
const videoContainer = document.querySelector(".video-container");
const counterContainer = document.getElementById("counter-container");

// Fullscreen mode flag
let isFullscreenMode = false;

// Model and detection variables
let detector;
let model;
let rafId;

// Thresholds
const STANDING_ANGLE = 170.0; // Standing straight (lowered slightly to be more forgiving)
const GOOD_SQUAT_LOWER_ANGLE = 45.0; // Lower bound (deeper) - lowered from 50.0
const GOOD_SQUAT_UPPER_ANGLE = 95.0; // Upper bound (less deep) - raised from 80.0
const MIN_REQUIRED_LOWER_ANGLE = 95.0; // Lower bound (deeper) - adjusted to match GOOD_SQUAT_UPPER_ANGLE
const MIN_REQUIRED_UPPER_ANGLE = 140.0; // Upper bound (less deep)
const TOO_DEEP_ANGLE = 35.0; // Too deep squat threshold
const KNEE_CAVING_THRESHOLD = 1.1; // Increased from 0.9 to match Python implementation
const CORRECT_MIN_RATIO = 0.85; // For ideal knee position reference
const CORRECT_MAX_RATIO = 1.61; // Maximum normal knee/ankle ratio
const KNEE_HISTORY_LENGTH = 10; // Number of frames to track for smoothing
const KNEE_CAVING_FRAME_THRESHOLD = 3; // Reduced from 5 to detect knee caving faster
const MAX_REPS_PER_SESSION = 12;
const MIN_ANGLE_CHANGE_FOR_REP = 30;
const STANDING_ANGLE_TOLERANCE = 5.0; // Tolerance for calibration

// State management
let exerciseState = "waiting";
const UP_POSITION = 0;
const GOING_DOWN = 1;
const DOWN_POSITION = 2;
const GOING_UP = 3;
let currentState = UP_POSITION;
let stateStartTime = 0;
const MIN_STATE_DURATION = 10; // Minimum frames in a state before transition

let repState = "up";
let repCounted = false;
let incorrectRepCounted = false;
let counter = 0;
let correctReps = 0;
let incorrectReps = 0;
let tooDeepCount = 0;
let notDeepEnoughCount = 0;
let kneeCavingCount = 0;
let currentRepTooDeep = false;
let currentRepNotDeepEnough = false;
let currentRepKneesCaved = false;
let minAngleInCurrentRep = 180;
let maxAngleInCurrentRep = 0;
let minKneeRatioInCurrentRep = 2.0;
let kneeCavingConsecutiveFrames = 0;
let kneeRatioHistory = [];
let sessionComplete = false;
let sessionCompletedTime = 0;
let previousKneeAngle = 180;

// Detection loss tracking
let detectionLostFrames = 0;
const MAX_DETECTION_LOST_FRAMES = 90;
let detectionFound = false;

// Smoothing for landmarks and angles
let landmarkHistory = {};
const SMOOTHING_FACTOR = 0.2;
let smoothedAngles = { knee: [] };
const ANGLE_SMOOTHING_WINDOW = 10;

// Feedback persistence
let feedbackHistory = new Map();
const FEEDBACK_PERSISTENCE = 5;
const FEEDBACK_THRESHOLD = 3;
let feedbackStates = {
  too_deep: { count: 0, active: false },
  not_deep_enough: { count: 0, active: false },
  knees_caving: { count: 0, active: false },
  good_form: { count: 0, active: false },
};

// Session data for visualization
let sessionData = {
  frame_count: [],
  knee_angles: [],
  knee_ratios: [],
  rep_markers: [],
  rep_knee_angles: [],
  rep_feedback: [],
  saved: false,
};

// Calibration state
let isCalibrating = false;
let calibrationStartTime = 0;
let calibrationProgress = 0;

// Keypoint colors and connections
const keypointColors = Array(17).fill("#FF0000");
const connectedKeypoints = [
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

const keypointMap = {
  nose: 0,
  left_eye: 1,
  right_eye: 2,
  left_ear: 3,
  right_ear: 4,
  left_shoulder: 5,
  right_shoulder: 6,
  left_elbow: 7,
  right_elbow: 8,
  left_wrist: 9,
  right_wrist: 10,
  left_hip: 11,
  right_hip: 12,
  left_knee: 13,
  right_knee: 14,
  left_ankle: 15,
  right_ankle: 16,
};

// Add HTML for session complete overlay
const sessionCompleteHTML = `
<div id="session-complete" class="hidden">
    <div class="session-content">
        <h1>Session Complete!</h1>
        
        <div class="stat-row">
            <span>Total Reps:</span>
            <span id="final-total-reps">0</span>
        </div>
        
        <div class="stat-row">
            <span>Good Form:</span>
            <span id="final-good-form" class="good">0</span>
        </div>
        
        <div class="stat-row">
            <span>Need Improvement:</span>
            <span id="final-bad-form" class="bad">0</span>
        </div>

        <div class="form-issues-section">
            <h2>Form Issues</h2>
            <div class="form-issues">
                <div class="issue-row">
                    <span>Knees Caving Inward:</span>
                    <span id="knees-caving-count">0</span>
                </div>
                <div class="issue-row">
                    <span>Too Deep:</span>
                    <span id="too-deep-count">0</span>
                </div>
                <div class="issue-row">
                    <span>Not Deep Enough:</span>
                    <span id="not-deep-count">0</span>
                </div>
            </div>
        </div>

        <div class="performance-score">
            <span>Performance Score:</span>
            <span id="final-score">0%</span>
        </div>

        <button id="nextBtn" class="next-btn">Next</button>
    </div>
</div>`;

// Add session complete HTML to the document
document.body.insertAdjacentHTML("beforeend", sessionCompleteHTML);

// Add styles for session complete screen
const style = document.createElement("style");
style.textContent = `
    #session-complete {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: Arial, sans-serif;
    }

    #session-complete.hidden {
        display: none;
    }

    .session-content {
        width: 90%;
        max-width: 400px;
        color: white;
    }

    #session-complete h1 {
        color: #4CAF50;
        text-align: center;
        font-size: 2.5em;
        margin-bottom: 1.5em;
    }

    #session-complete h2 {
        color: white;
        font-size: 1.2em;
        margin: 1em 0;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        margin: 0.8em 0;
        font-size: 1.2em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.5em;
    }

    .form-issues-section {
        background: rgba(255, 255, 255, 0.05);
        padding: 1em;
        border-radius: 8px;
        margin: 1.5em 0;
    }

    .issue-row {
        display: flex;
        justify-content: space-between;
        margin: 0.5em 0;
        font-size: 1.1em;
    }

    .good {
        color: #4CAF50;
    }

    .bad {
        color: #f44336;
    }

    .performance-score {
        background: #4CAF50;
        padding: 1em;
        border-radius: 8px;
        text-align: center;
        font-size: 1.2em;
        margin-top: 1.5em;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    #final-score {
        font-weight: bold;
        font-size: 1.2em;
    }

    .next-btn {
        display: block;
        width: 100%;
        margin-top: 2rem;
        padding: 1rem;
        background: linear-gradient(to right, #4CAF50, #45a049);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1.2rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .next-btn:hover {
        background: linear-gradient(to right, #45a049, #4CAF50);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .next-btn:active {
        transform: translateY(0);
    }

    @media (max-width: 480px) {
        .next-btn {
            font-size: 1.1rem;
            padding: 0.8rem;
            margin-top: 1.5rem;
        }
    }
`;

document.head.appendChild(style);

// Add style for back button
const backButtonStyle = document.createElement("style");
backButtonStyle.textContent = `
    .back-btn {
        background: linear-gradient(to right, #808080, #666666);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-right: 10px;
        transition: all 0.3s ease;
    }

    .back-btn:hover {
        background: linear-gradient(to right, #666666, #808080);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .back-btn:active {
        transform: translateY(0);
    }

    @media (max-width: 480px) {
        .back-btn {
            padding: 8px 16px;
            font-size: 14px;
        }
    }
`;
document.head.appendChild(backButtonStyle);

// CUSTOMIZATION INSTRUCTION:
// Replace 'YOUR_BACK_PAGE_URL' with the URL where you want to redirect users when clicking back
// Example: '/previous-page.html' or 'https://your-website.com/previous-page'
const backPageUrl = "/workout";

// Add back button click handler
backBtn.addEventListener("click", () => {
  // Stop camera if it's running
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
  }
  // Cancel animation frame if active
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  // Redirect to the specified URL
  window.location.href = backPageUrl;
});

// Helper Functions
function smoothLandmarks(keypoints) {
  const smoothedKeypoints = [...keypoints];
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];
    const id = i;
    if (keypoint.score > 0.2) {
      const position = { x: keypoint.x, y: keypoint.y };
      if (landmarkHistory[id]) {
        const smoothedX =
          SMOOTHING_FACTOR * position.x +
          (1 - SMOOTHING_FACTOR) * landmarkHistory[id].x;
        const smoothedY =
          SMOOTHING_FACTOR * position.y +
          (1 - SMOOTHING_FACTOR) * landmarkHistory[id].y;
        smoothedKeypoints[i] = { ...keypoint, x: smoothedX, y: smoothedY };
        landmarkHistory[id] = { x: smoothedX, y: smoothedY };
      } else {
        landmarkHistory[id] = position;
      }
    }
  }
  return smoothedKeypoints;
}

function calculateAngle(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: b.x - c.x, y: b.y - c.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  const angleRad = Math.acos(dot / (magAB * magCB));
  return angleRad * (180 / Math.PI);
}

function smoothAngle(newValue, angleType) {
  smoothedAngles[angleType].push(newValue);
  if (smoothedAngles[angleType].length > ANGLE_SMOOTHING_WINDOW) {
    smoothedAngles[angleType].shift();
  }
  return (
    smoothedAngles[angleType].reduce((sum, val) => sum + val, 0) /
    smoothedAngles[angleType].length
  );
}

function updateFeedbackState(type, condition, text, color) {
  if (condition) {
    feedbackStates[type].count = Math.min(
      feedbackStates[type].count + 1,
      FEEDBACK_THRESHOLD + 5
    );
    if (
      feedbackStates[type].count >= FEEDBACK_THRESHOLD &&
      !feedbackStates[type].active
    ) {
      feedbackStates[type].active = true;
      feedbackHistory.set(text, { color: color, count: FEEDBACK_PERSISTENCE });
    } else if (feedbackStates[type].active) {
      feedbackHistory.set(text, { color: color, count: FEEDBACK_PERSISTENCE });
    }
  } else {
    feedbackStates[type].count = Math.max(0, feedbackStates[type].count - 1);
    if (feedbackStates[type].count === 0 && feedbackStates[type].active) {
      feedbackStates[type].active = false;
      feedbackHistory.delete(text);
    }
  }
}

function drawFeedback(messages) {
  requestAnimationFrame(() => {
    const expiredMessages = [];
    feedbackHistory.forEach((item, text) => {
      item.count--;
      if (item.count <= 0) expiredMessages.push(text);
    });
    expiredMessages.forEach((text) => feedbackHistory.delete(text));
    if (feedbackHistory.size === 0) {
      feedback.classList.add("hidden");
      feedback.innerHTML = "";
      return;
    }
    feedback.classList.remove("hidden");
    const fragment = document.createDocumentFragment();
    feedbackHistory.forEach((item, text) => {
      const opacity = Math.max(0.3, item.count / FEEDBACK_PERSISTENCE);
      let icon = "fa-info-circle";
      if (text.includes("Good")) icon = "fa-check-circle";
      else if (text.includes("Knees")) icon = "fa-exclamation-triangle";
      else if (text.includes("Deep")) icon = "fa-arrow-down";
      else if (text.includes("Stand")) icon = "fa-user";
      const div = document.createElement("div");
      div.style.color = item.color;
      div.style.opacity = opacity;
      const iconEl = document.createElement("i");
      iconEl.className = `fas ${icon}`;
      div.appendChild(iconEl);
      div.appendChild(document.createTextNode(` ${text}`));
      fragment.appendChild(div);
    });
    feedback.innerHTML = "";
    feedback.appendChild(fragment);
  });
}

function drawArrow(ctx, startPoint, endPoint, color, thickness = 3) {
  ctx.beginPath();
  ctx.moveTo(startPoint.x, startPoint.y);
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
  const angle = Math.atan2(
    endPoint.y - startPoint.y,
    endPoint.x - startPoint.x
  );
  const headLength = 15;
  ctx.beginPath();
  ctx.moveTo(endPoint.x, endPoint.y);
  ctx.lineTo(
    endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
    endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
    endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.lineTo(endPoint.x, endPoint.y);
  ctx.fillStyle = color;
  ctx.fill();
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t); // Easing function for fast start, slow end
}

function drawLoadingBar(progress) {
  ctx.save();
  ctx.fillStyle = "#4CAF50";
  const barHeight = 20;
  const barWidth = canvas.width * progress;
  ctx.fillRect(0, canvas.height - barHeight, barWidth, barHeight);
  ctx.restore();
}

async function calibratePose() {
  if (!detector || !video.readyState || video.readyState < 2) {
    await new Promise((resolve) => {
      video.onloadeddata = () => resolve(video);
    });
  }
  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (poses && poses.length > 0) {
    const pose = poses[0];
    if (pose.keypoints && pose.keypoints.length > 0) {
      const rightHip = pose.keypoints[12];
      const rightKnee = pose.keypoints[14];
      const rightAnkle = pose.keypoints[16];
      const leftAnkle = pose.keypoints[15];
      const kneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      const anklesVisible = rightAnkle.score > 0.3 && leftAnkle.score > 0.3;
      if (
        Math.abs(kneeAngle - STANDING_ANGLE) <= STANDING_ANGLE_TOLERANCE &&
        anklesVisible
      ) {
        console.log(
          "Calibration successful: User is standing straight with feet visible"
        );
        return true;
      } else {
        feedbackHistory.set("Stand straight with feet visible", {
          color: "#FFA500",
          count: FEEDBACK_PERSISTENCE,
        });
        drawFeedback();
      }
    }
  }
  return false;
}

async function animateLoadingBar() {
  const duration = 1000;
  calibrationStartTime = performance.now();
  function animate(currentTime) {
    const elapsed = currentTime - calibrationStartTime;
    calibrationProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuad(calibrationProgress);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawLoadingBar(easedProgress);
    drawFeedback();
    if (calibrationProgress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      console.log("Loading bar animation complete");
      isCalibrating = false;
      startBtn.textContent = "Running";
      resetBtn.disabled = false;
      resetTrainer();
      detectPose();
    }
  }
  rafId = requestAnimationFrame(animate);
}

async function setupDetector() {
  const modelType = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
  model = poseDetection.SupportedModels.MoveNet;
  detector = await poseDetection.createDetector(model, {
    modelType,
    enableSmoothing: true,
  });
  console.log("MoveNet model loaded successfully");
}

async function setupCamera() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const constraints = {
    video: {
      facingMode: "user",
      width: { ideal: isMobile ? 1280 : 1920 },
      height: { ideal: isMobile ? 720 : 1080 },
    },
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.style.transform = "scaleX(-1)";
        canvas.style.transform = "scaleX(-1)";
        video.style.objectFit = "cover";
        canvas.style.objectFit = "cover";
        document.body.classList.add("camera-initialized");
        console.log(`Camera dimensions: ${canvas.width}x${canvas.height}`);
        resolve(video);
      };
    });
  } catch (error) {
    console.error("Error accessing webcam:", error);
    alert(
      "Error accessing webcam. Please ensure a webcam is connected and permissions are granted."
    );
    throw error;
  }
}

const TARGET_FPS = 30;
let lastDetectionTime = 0;

async function detectPose() {
  const now = performance.now();
  if (now - lastDetectionTime < 1000 / TARGET_FPS) {
    rafId = requestAnimationFrame(detectPose);
    return;
  }
  lastDetectionTime = now;
  if (!detector || !video.readyState) {
    video.onloadeddata = () => {
      rafId = requestAnimationFrame(detectPose);
    };
    return;
  }
  detectionFound = false;
  if (video.readyState < 2) {
    await new Promise((resolve) => {
      video.onloadeddata = () => resolve(video);
    });
  }
  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (poses && poses.length > 0) {
    const pose = poses[0];
    if (pose.keypoints && pose.keypoints.length > 0) {
      const smoothedKeypoints = smoothLandmarks(pose.keypoints);
      processDetection(smoothedKeypoints);
      drawPose({ ...pose, keypoints: smoothedKeypoints });
    }
  }
  if (!detectionFound) {
    handleDetectionLoss();
  } else {
    detectionWarning.classList.add("hidden");
    detectionLostFrames = 0;
  }
  rafId = requestAnimationFrame(detectPose);
}

function processDetection(keypoints) {
  sessionData.frame_count.push(sessionData.frame_count.length);
  const requiredLandmarks = [11, 12, 13, 14, 15, 16];
  const visibleLandmarks = requiredLandmarks.filter(
    (idx) => keypoints[idx].score > 0.2
  );
  if (visibleLandmarks.length >= requiredLandmarks.length - 1) {
    detectionFound = true;
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];
    const rawKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const kneeAngle = smoothAngle(rawKneeAngle, "knee");
    console.log(
      `Raw Knee Angle: ${rawKneeAngle.toFixed(
        1
      )}°, Smoothed Knee Angle: ${kneeAngle.toFixed(1)}°`
    );

    if (kneeAngle < minAngleInCurrentRep) {
      minAngleInCurrentRep = kneeAngle;
    }
    if (kneeAngle > maxAngleInCurrentRep) {
      maxAngleInCurrentRep = kneeAngle;
    }

    // Keep the UI feedback code
    const per = Math.min(
      100,
      Math.max(
        0,
        ((kneeAngle - TOO_DEEP_ANGLE) / (STANDING_ANGLE - TOO_DEEP_ANGLE)) * 100
      )
    );
    depthBar.classList.remove("hidden");
    const barHeight = 300;
    const filledHeight = (per * barHeight) / 100;
    depthIndicator.style.bottom = `${filledHeight}px`;

    // Track form issues during the rep
    let errorThisFrame = false;

    // Check depth issues
    if (kneeAngle < TOO_DEEP_ANGLE) {
      currentRepErrors.push("Too deep");
      hasError = true;
      errorThisFrame = true;
      currentRepTooDeep = true;
      depthIndicator.style.background = "#FF0000";
    } else if (kneeAngle > MIN_REQUIRED_UPPER_ANGLE) {
      currentRepErrors.push("Not deep enough");
      hasError = true;
      errorThisFrame = true;
      currentRepNotDeepEnough = true;
      depthIndicator.style.background = "#FFA500";
    } else if (
      kneeAngle >= GOOD_SQUAT_LOWER_ANGLE &&
      kneeAngle <= GOOD_SQUAT_UPPER_ANGLE
    ) {
      currentRepTooDeep = false;
      currentRepNotDeepEnough = false;
      depthIndicator.style.background = "#4CAF50";
    } else {
      depthIndicator.style.background = "#FFFF00";
    }

    // Check knee caving
    const kneeWidth = Math.abs(rightKnee.x - leftKnee.x);
    const ankleWidth = Math.abs(rightAnkle.x - leftAnkle.x);
    if (ankleWidth > 0) {
      // Changed from 10 to be more sensitive
      const kneeAnkleRatio = kneeWidth / ankleWidth;
      console.log("Knee/Ankle Ratio:", kneeAnkleRatio); // Debug logging

      kneeRatioHistory.push(kneeAnkleRatio);
      if (kneeRatioHistory.length > KNEE_HISTORY_LENGTH) {
        kneeRatioHistory.shift(); // Remove oldest entry
      }
      const smoothedKneeRatio =
        kneeRatioHistory.reduce((sum, val) => sum + val, 0) /
        kneeRatioHistory.length;
      console.log("Smoothed Knee Ratio:", smoothedKneeRatio); // Debug logging

      // Only check knee caving when in a meaningful squat depth (between MIN_REQUIRED_UPPER_ANGLE and TOO_DEEP_ANGLE)
      const isInSquatPosition =
        kneeAngle <= MIN_REQUIRED_UPPER_ANGLE && kneeAngle > TOO_DEEP_ANGLE;

      if (isInSquatPosition) {
        // Simple binary decision: below threshold = bad (red), above = good (green)
        let knee_line_color = "#4CAF50"; // Default green
        let knee_line_thickness = 2;

        // More aggressive knee caving detection
        if (
          smoothedKneeRatio < KNEE_CAVING_THRESHOLD ||
          kneeWidth < ankleWidth
        ) {
          console.log("Knee caving detected!"); // Debug logging
          knee_line_color = "#FF0000"; // Red
          knee_line_thickness = 6; // Thicker line when caving
          kneeCavingConsecutiveFrames++;

          if (kneeCavingConsecutiveFrames >= KNEE_CAVING_FRAME_THRESHOLD) {
            currentRepKneesCaved = true;

            // Add warning text above the knees
            ctx.font = "24px Arial";
            ctx.fillStyle = "#FF0000";
            const warningText = "KNEES CAVING IN!";
            const textWidth = ctx.measureText(warningText).width;
            ctx.fillText(
              warningText,
              (leftKnee.x + rightKnee.x) / 2 - textWidth / 2,
              leftKnee.y - 20
            );

            // Draw ideal knee position as a reference
            const idealKneeDistance = ankleWidth * CORRECT_MIN_RATIO * 1.3; // Wider reference line
            const leftIdealX = Math.round(rightKnee.x - idealKneeDistance);

            // Draw ideal line in green with better visibility
            ctx.beginPath();
            ctx.strokeStyle = "#4CAF50";
            ctx.lineWidth = 2; // Slightly thicker for better visibility
            ctx.setLineDash([5, 5]); // Dashed line for ideal position
            ctx.moveTo(leftIdealX, leftKnee.y);
            ctx.lineTo(rightKnee.x, rightKnee.y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line style

            // Draw correction arrows with better visibility
            const midY = (leftKnee.y + rightKnee.y) / 2;
            drawArrow(
              ctx,
              { x: leftKnee.x + 10, y: midY },
              { x: leftKnee.x - 30, y: midY },
              "#FF0000",
              4
            );
            drawArrow(
              ctx,
              { x: rightKnee.x - 10, y: midY },
              { x: rightKnee.x + 30, y: midY },
              "#FF0000",
              4
            );

            // Add corrective instruction at bottom with shadow for better visibility
            const instruction = "Push knees outward!";
            ctx.font = "20px Arial";
            const instructionWidth = ctx.measureText(instruction).width;

            // Add shadow to text
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillText(
              instruction,
              canvas.width / 2 - instructionWidth / 2 + 2,
              canvas.height - 28
            );
            ctx.fillStyle = "#FF0000";
            ctx.fillText(
              instruction,
              canvas.width / 2 - instructionWidth / 2,
              canvas.height - 30
            );

            // Update feedback
            feedbackHistory.set("Push knees outward!", {
              color: "#FF0000",
              count: FEEDBACK_PERSISTENCE,
            });

            // Mark rep as incorrect only if we're in squat position
            hasError = true;
            currentRepErrors.push("Knees caving inward");
          }
        } else {
          kneeCavingConsecutiveFrames = Math.max(
            0,
            kneeCavingConsecutiveFrames - 1
          ); // Gradual decrease
        }

        // Always draw the knee connection line
        ctx.beginPath();
        ctx.strokeStyle = knee_line_color;
        ctx.lineWidth = knee_line_thickness;
        ctx.moveTo(leftKnee.x, leftKnee.y);
        ctx.lineTo(rightKnee.x, rightKnee.y);
        ctx.stroke();
      } else {
        // Reset knee caving detection when not in squat position
        kneeCavingConsecutiveFrames = 0;
        currentRepKneesCaved = false;

        // Draw normal knee line when standing
        ctx.beginPath();
        ctx.strokeStyle = "#4CAF50"; // Always green when standing
        ctx.lineWidth = 2;
        ctx.moveTo(leftKnee.x, leftKnee.y);
        ctx.lineTo(rightKnee.x, rightKnee.y);
        ctx.stroke();
      }

      // Record knee ratio data for visualization
      sessionData.knee_ratios.push(smoothedKneeRatio);
    }

    // Update feedback states
    sessionData.knee_angles.push(kneeAngle);
    const feedbackMessages = [];
    updateFeedbackState(
      "too_deep",
      currentRepTooDeep,
      "Squat too deep!",
      "#FF0000"
    );
    updateFeedbackState(
      "not_deep_enough",
      currentRepNotDeepEnough,
      "Squat deeper!",
      "#FFA500"
    );
    updateFeedbackState(
      "knees_caving",
      currentRepKneesCaved &&
        kneeAngle <= GOOD_SQUAT_UPPER_ANGLE &&
        kneeAngle > TOO_DEEP_ANGLE,
      "Push knees outward!",
      "#FF0000"
    );
    updateFeedbackState(
      "good_form",
      !currentRepTooDeep &&
        !currentRepNotDeepEnough &&
        !currentRepKneesCaved &&
        kneeAngle <= GOOD_SQUAT_UPPER_ANGLE,
      "Good form!",
      "#4CAF50"
    );

    // State transition logic
    const currentTime = performance.now();
    const timeInCurrentState = currentTime - stateStartTime;

    if (
      currentState === UP_POSITION &&
      kneeAngle < STANDING_ANGLE - 20 &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = GOING_DOWN;
      stateStartTime = currentTime;
      console.log("Starting to go down");
    } else if (
      currentState === GOING_DOWN &&
      kneeAngle < MIN_REQUIRED_UPPER_ANGLE &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = DOWN_POSITION;
      stateStartTime = currentTime;
      console.log("Reached bottom position");
    } else if (
      currentState === DOWN_POSITION &&
      kneeAngle > MIN_REQUIRED_UPPER_ANGLE &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = GOING_UP;
      stateStartTime = currentTime;
      console.log("Starting to go up");
    } else if (
      currentState === GOING_UP &&
      kneeAngle > STANDING_ANGLE - 20 &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      // Complete rep validation
      const angleChange = maxAngleInCurrentRep - minAngleInCurrentRep;
      console.log(`Angle change in rep: ${angleChange.toFixed(1)}°`);

      if (angleChange >= MIN_ANGLE_CHANGE_FOR_REP && !sessionComplete) {
        let isIncorrect = false;
        let incorrectReason = "";

        // Form validation - now more descriptive about depth issues
        if (minAngleInCurrentRep < TOO_DEEP_ANGLE) {
          isIncorrect = true;
          incorrectReason = "Too deep";
          tooDeepCount++;
        } else if (minAngleInCurrentRep > MIN_REQUIRED_UPPER_ANGLE) {
          isIncorrect = true;
          incorrectReason = "Not deep enough";
          notDeepEnoughCount++;
        } else if (minAngleInCurrentRep > GOOD_SQUAT_UPPER_ANGLE) {
          // New condition: Partial squat but still counted
          isIncorrect = true;
          incorrectReason = "Partial squat";
          notDeepEnoughCount++;
        } else if (currentRepKneesCaved) {
          isIncorrect = true;
          incorrectReason = "Knees caving inward";
          kneeCavingCount++;
        }

        // Always count the rep, but classify it
        counter++;

        if (!isIncorrect) {
          correctReps++;
          sessionData.rep_feedback.push("Good form");
          console.log(
            `Good Rep Counted: Total=${counter}, Correct=${correctReps}`
          );
          feedbackHistory.set("Good depth!", {
            color: "#4CAF50",
            count: FEEDBACK_PERSISTENCE,
          });
        } else {
          incorrectReps++;
          sessionData.rep_feedback.push(incorrectReason);
          console.log(
            `Incorrect Rep Counted: Total=${counter}, Incorrect=${incorrectReps}, Reason=${incorrectReason}`
          );

          // Add specific feedback for partial squats
          if (incorrectReason === "Partial squat") {
            feedbackHistory.set("Try to squat deeper", {
              color: "#FFA500",
              count: FEEDBACK_PERSISTENCE,
            });
          } else if (incorrectReason === "Not deep enough") {
            feedbackHistory.set("Squat needs to be deeper", {
              color: "#FF0000",
              count: FEEDBACK_PERSISTENCE,
            });
          }
        }

        // Store rep data
        sessionData.rep_markers.push(sessionData.frame_count.length);
        sessionData.rep_knee_angles.push(minAngleInCurrentRep);

        // Update UI
        repCounter.textContent = `Total: ${counter}`;
        correctCounter.textContent = `Good: ${correctReps}`;
        incorrectCounter.textContent = `Bad: ${incorrectReps}`;

        // Check if session is complete
        if (counter >= MAX_REPS_PER_SESSION && !sessionComplete) {
          sessionComplete = true;
          sessionCompletedTime = Date.now();
          console.log(
            `Session completed! ${MAX_REPS_PER_SESSION} reps finished.`
          );
          if (video.srcObject) {
            video.srcObject.getTracks().forEach((track) => track.stop());
          }
          if (rafId) {
            cancelAnimationFrame(rafId);
          }
          if (!sessionData.saved) {
            generateResultsFile();
            sessionData.saved = true;
          }
          exitFullscreenMode();
          setTimeout(showSessionComplete, 500);
        }
      }

      // Reset for next rep
      currentState = UP_POSITION;
      stateStartTime = currentTime;
      minAngleInCurrentRep = 180;
      maxAngleInCurrentRep = 0;
      minKneeRatioInCurrentRep = 2.0;
      currentRepKneesCaved = false;
      currentRepTooDeep = false;
      currentRepNotDeepEnough = false;
      kneeCavingConsecutiveFrames = 0;
      console.log("Reset for next rep");
    }

    previousKneeAngle = kneeAngle;
    drawFeedback(feedbackMessages);
  } else {
    console.log(
      `Detection weak: Visible landmarks = ${visibleLandmarks.length}/${requiredLandmarks.length}`
    );
    detectionFound = false;
  }
}

function handleDetectionLoss() {
  detectionLostFrames++;
  if (detectionLostFrames >= MAX_DETECTION_LOST_FRAMES) {
    detectionWarning.classList.remove("hidden");
    console.log("Detection lost for too long, showing warning...");
  }
}

function drawPose(pose) {
  if (!pose || !pose.keypoints) return;
  const keypoints = pose.keypoints;
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];
    if (keypoint.score > 0.2) {
      ctx.fillStyle = keypointColors[i];
      ctx.fillRect(keypoint.x - 4, keypoint.y - 4, 8, 8);
    }
  }
  ctx.lineWidth = 4;
  connectedKeypoints.forEach(([keypointA, keypointB]) => {
    const indexA = keypointMap[keypointA];
    const indexB = keypointMap[keypointB];
    const keypointA_obj = keypoints[indexA];
    const keypointB_obj = keypoints[indexB];
    if (keypointA_obj.score > 0.2 && keypointB_obj.score > 0.2) {
      ctx.strokeStyle = "#00FF00";
      ctx.beginPath();
      ctx.moveTo(keypointA_obj.x, keypointA_obj.y);
      ctx.lineTo(keypointB_obj.x, keypointB_obj.y);
      ctx.stroke();
    }
  });
}

function resetTrainer() {
  counter = 0;
  correctReps = 0;
  incorrectReps = 0;
  tooDeepCount = 0;
  notDeepEnoughCount = 0;
  kneeCavingCount = 0;
  badReps = {
    total: 0,
    too_deep: 0,
    not_deep_enough: 0,
    knees_caving: 0,
  };
  currentRepHasError = false;
  currentRepErrors = [];
  hasError = false;
  repCounted = false;
  sessionComplete = false;
  sessionCompletedTime = 0;
  minAngleInCurrentRep = 180;
  maxAngleInCurrentRep = 0;
  minKneeRatioInCurrentRep = 2.0;
  kneeCavingConsecutiveFrames = 0;
  kneeRatioHistory = [];
  detectionLostFrames = 0;
  feedbackHistory.clear();
  feedback.classList.add("hidden");
  repCounter.textContent = `Total: ${counter}`;
  correctCounter.textContent = `Good: ${correctReps}`;
  incorrectCounter.textContent = `Bad: ${incorrectReps}`;
  counterContainer.classList.remove("hidden");
  depthBar.classList.remove("hidden");
  sessionData = {
    frame_count: [],
    knee_angles: [],
    knee_ratios: [],
    rep_markers: [],
    rep_knee_angles: [],
    rep_feedback: [],
    saved: false,
  };
  previousKneeAngle = 180;
  console.log("Trainer reset");
}

function enterFullscreenMode() {
  if (isFullscreenMode) return;
  document.body.classList.add("fullscreen-mode");
  exitFullscreenBtn.classList.remove("hidden");
  isFullscreenMode = true;
  if (videoContainer.requestFullscreen) {
    videoContainer
      .requestFullscreen()
      .catch((err) => console.log("Error enabling fullscreen:", err));
  }
}

function exitFullscreenMode() {
  if (!isFullscreenMode) return;
  document.body.classList.remove("fullscreen-mode");
  document.body.classList.remove("camera-active");
  exitFullscreenBtn.classList.add("hidden");
  isFullscreenMode = false;
  if (document.fullscreenElement) {
    document
      .exitFullscreen()
      .catch((err) => console.log("Error exiting fullscreen:", err));
  }

  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  startBtn.disabled = false;
  startBtn.textContent = "Start Camera";
}

async function startApp() {
  try {
    startBtn.disabled = true;
    startBtn.textContent = "Loading...";
    if (!detector) await setupDetector();
    if (!video.srcObject) await setupCamera();
    document.body.classList.add("camera-active");
    enterFullscreenMode();
    video.play();
    isCalibrating = true;
    feedbackHistory.set("Stand straight with feet visible", {
      color: "#FFA500",
      count: FEEDBACK_PERSISTENCE,
    });
    async function checkCalibration() {
      if (await calibratePose()) {
        await animateLoadingBar();
      } else {
        rafId = requestAnimationFrame(checkCalibration);
      }
    }
    rafId = requestAnimationFrame(checkCalibration);
    console.log("Squat Trainer started, awaiting calibration");
  } catch (error) {
    console.error("Error starting the application:", error);
    startBtn.disabled = false;
    startBtn.textContent = "Start Camera";
    alert(
      "Error starting the application. Please ensure a webcam is connected and permissions are granted."
    );
  }
}

startBtn.addEventListener("click", startApp);
resetBtn.addEventListener("click", resetTrainer);
exitFullscreenBtn.addEventListener("click", exitFullscreenMode);

function calculatePerformanceScore() {
  if (counter === 0) return 0;

  // Base score from correct reps percentage (70% weight)
  const repScore = (correctReps / counter) * 70;

  // Form score based on the ratio of form issues to total reps (30% weight)
  // Weight knee caving issues more heavily (1.5x)
  const totalIssues = tooDeepCount + notDeepEnoughCount + kneeCavingCount * 1.5;
  const formScore = Math.max(0, 30 * (1 - totalIssues / counter));

  // Calculate final score
  const finalScore = Math.round(repScore + formScore);

  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, finalScore));
}

function createResultsObject() {
  const performanceScore = calculatePerformanceScore();
  const currentDate = new Date();
  return {
    workoutName: "Squat",
    date: currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
    sets: 1,
    reps: { total: counter, correct: correctReps, incorrect: incorrectReps },
    formIssues: {
      tooDeep: tooDeepCount,
      notDeepEnough: notDeepEnoughCount,
      kneesCaving: kneeCavingCount,
    },
    performanceScore: performanceScore,
    sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    sessionData: sessionData,
  };
}

function saveSessionData(resultsObject) {
  try {
    // Save to localStorage with the specified structure
    const localStorageData = {
      workoutName: resultsObject.workoutName,
      date: resultsObject.date,
      time: resultsObject.time,
      sets: resultsObject.sets,
      reps: resultsObject.reps,
      formIssues: resultsObject.formIssues,
      performanceScore: resultsObject.performanceScore,
      sessionId: resultsObject.sessionId,
      sessionData: {
        rep_feedback: resultsObject.sessionData.rep_feedback,
        saved: true,
      },
    };
    localStorage.setItem("workoutBackup", JSON.stringify(localStorageData));
    console.log('Workout data saved to localStorage under "workoutBackup"');
    return true;
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    return false;
  }
}

// Save workout data to localStorage
function generateResultsFile() {
  const resultsObject = createResultsObject();
  console.log("Saving workout data:", resultsObject);
  saveSessionData(resultsObject);
}

window.addEventListener("beforeunload", () => {
  if (rafId) cancelAnimationFrame(rafId);
  if (video.srcObject)
    video.srcObject.getTracks().forEach((track) => track.stop());
});

console.log("Squat Trainer initialized. Press Start Camera to begin.");

function showSessionComplete() {
  // Hide the video container and controls
  document.querySelector(".video-container").style.display = "none";
  document.querySelector(".controls").style.display = "none";

  const sessionComplete = document.getElementById("session-complete");
  sessionComplete.classList.remove("hidden");

  // Update statistics
  document.getElementById("final-total-reps").textContent = counter;
  document.getElementById("final-good-form").textContent = correctReps;
  document.getElementById("final-bad-form").textContent = incorrectReps;

  // Update form issues
  document.getElementById("knees-caving-count").textContent = kneeCavingCount;
  document.getElementById("too-deep-count").textContent = tooDeepCount;
  document.getElementById("not-deep-count").textContent = notDeepEnoughCount;

  // Calculate and update performance score
  const performanceScore = calculatePerformanceScore();
  document.getElementById("final-score").textContent = performanceScore + "%";

  // Add event listener to next button
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      window.location.href = "/workoutFeedback";
    });
  }
}
