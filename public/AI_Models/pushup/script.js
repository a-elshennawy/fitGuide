// DOM elements
const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const detectionWarning = document.getElementById("detection-warning");
const repCounter = document.getElementById("rep-counter");
const correctCounter = document.getElementById("correct-counter");
const incorrectCounter = document.getElementById("incorrect-counter");
const feedback = document.getElementById("feedback");
const exitFullscreenBtn = document.getElementById("exitFullscreenBtn");
const videoContainer = document.querySelector(".video-container");
const counterContainer = document.getElementById("counter-container");

// Video recording variables
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Initialize counters
counter = 0;
correctReps = 0;
incorrectReps = 0;
repCounter.textContent = `Total: ${counter}`;
correctCounter.textContent = `Good: ${correctReps}`;
incorrectCounter.textContent = `Bad: ${incorrectReps}`;
counterContainer.classList.remove("hidden");

let reactRouter = null;

function setupRouterBridge(router) {
  reactRouter = router;
}
// Setup back button functionality

const mainBackBtn = document.getElementById("backBtn");
if (mainBackBtn) {
  mainBackBtn.addEventListener("click", () => {
    const video = document.getElementById("video");
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }
    window.location.href = "/workout"; // Simple page reload
  });
}

// Fullscreen mode flag
let isFullscreenMode = false;

// Model and detection variables
let detector;
let model;
let rafId;

// Thresholds (matched to Python script)
const ELBOW_EXTENDED_ANGLE = 150; // Nearly straight arms at top position
const ELBOW_BENT_ANGLE = 100; // Proper bottom position
const ELBOW_WIDTH_THRESHOLD = 2.0; // For T-shape detection
const MAX_REPS_PER_SESSION = 12;
const UP_THRESHOLD = 140; // Angle above which we consider the person in up position
const DOWN_THRESHOLD = 110; // Angle below which we consider the person in down position
const MIN_ANGLE_CHANGE_FOR_REP = 30; // Minimum angle change for a valid rep
const POSITION_THRESHOLD = 15;
const COUNTDOWN_DURATION = 3;
const MAX_DETECTION_LOST_FRAMES = 30;

// Add state duration tracking from Python
let stateStartTime = 0;
const MIN_STATE_DURATION = 30; // Minimum frames in a state before transition

// Rep counting and form tracking
let repState = "up";
let repCounted = false;
let incorrectRepCounted = false;
let improperElbowAngleCount = 0;
let currentRepImproperElbowAngle = false;
let minElbowAngleInCurrentRep = 180;
let maxElbowAngleInCurrentRep = 0;
let sessionComplete = false;
let sessionCompletedTime = 0;
let previousElbowAngle = 180;
let tShapeDetectedInRep = false;

// State machine (matching Python)
const UP_POSITION = 0;
const GOING_DOWN = 1;
const DOWN_POSITION = 2;
const GOING_UP = 3;
let currentState = UP_POSITION;

// Exercise state
let exerciseState = "waiting";
let positionFrames = 0;
let countdownStarted = false;
let countdownStartTime = 0;

// Detection loss tracking
let detectionLostFrames = 0;
let detectionFound = false;

// Smoothing for landmarks and angles
let landmarkHistory = {};
const SMOOTHING_FACTOR = 0.4;
let smoothedAngles = { elbow: [] };
const ANGLE_SMOOTHING_WINDOW = 3;

// Feedback persistence
let feedbackHistory = new Map();
const FEEDBACK_PERSISTENCE = 5;
const FEEDBACK_THRESHOLD = 3;
let feedbackStates = {
  improper_elbow: { count: 0, active: false },
  good_form: { count: 0, active: false },
  get_in_position: { count: 0, active: false },
  form_depth: { count: 0, active: false },
};

// Session data for visualization
let sessionData = {
  frame_count: [],
  elbow_angles: [],
  elbow_width_ratios: [],
  rep_markers: [],
  rep_depths: [],
  rep_feedback: [],
  saved: false,
};

// Keypoint colors and connections
const keypointColors = Array(17).fill("#FF0000");
const connectedKeypoints = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
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
    <h1>Session Complete!</h1>
    <div class="stats">
        <div class="stat-row">
            <span>Total Reps:</span>
            <span id="final-total-reps"></span>
        </div>
        <div class="stat-row">
            <span>Good Form:</span>
            <span id="final-good-form" class="good"></span>
        </div>
        <div class="stat-row">
            <span>Need Improvement:</span>
            <span id="final-bad-form" class="bad"></span>
        </div>
    </div>
    <div class="form-issues">
        <h2>Form Issues</h2>
        <div class="issue-row">
            <span>Elbow Outward (T-shape):</span>
            <span id="elbow-tshape">0</span>
        </div>
    </div>
    <div class="performance-score">
        <span>Performance Score:</span>
        <span id="final-score"></span>
    </div>
    <button id="nextBtn" class="next-btn">Next</button>
</div>`;

// Add CSS for session complete overlay
const sessionCompleteCSS = `
#session-complete {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1a;
    padding: 2rem;
    border-radius: 10px;
    color: white;
    width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

#session-complete.hidden {
    display: none;
}

#session-complete h1 {
    color: #4CAF50;
    text-align: center;
    margin-bottom: 2rem;
}

.stats .stat-row, .form-issues .issue-row {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
    padding: 0.5rem 0;
    border-bottom: 1px solid #333;
}

.form-issues {
    background: #252525;
    padding: 1rem;
    border-radius: 5px;
    margin: 1rem 0;
}

.form-issues h2 {
    margin-top: 0;
    font-size: 1.2rem;
    color: white;
}

.good { color: #4CAF50; }
.bad { color: #f44336; }

.performance-score {
    background: #4CAF50;
    padding: 1rem;
    border-radius: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
}`;

// Add style element to head
const style = document.createElement("style");
style.textContent = sessionCompleteCSS;
document.head.appendChild(style);

// Add session complete div to body
const sessionCompleteDiv = document.createElement("div");
sessionCompleteDiv.innerHTML = sessionCompleteHTML;
document.body.appendChild(sessionCompleteDiv.firstElementChild);

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
      else if (text.includes("Elbows") || text.includes("T-shape"))
        icon = "fa-exclamation-triangle";
      else if (text.includes("position")) icon = "fa-user";
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
  return 1 - (1 - t) * (1 - t);
}

function drawLoadingBar(progress) {
  ctx.save();
  ctx.fillStyle = "#4CAF50";
  const barHeight = 20;
  const barWidth = canvas.width * progress;
  ctx.fillRect(canvas.width / 2 - 100, 100, barWidth, barHeight);
  ctx.restore();
}

function drawCountdown(secondsLeft) {
  ctx.save();
  ctx.font = "80px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(secondsLeft.toString(), canvas.width / 2, canvas.height / 2);
  ctx.font = "24px Arial";
  ctx.fillStyle = "#4CAF50";
  ctx.fillText("Get Ready!", canvas.width / 2, canvas.height / 2 - 60);
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
      const rightShoulder = pose.keypoints[6];
      const rightElbow = pose.keypoints[8];
      const rightWrist = pose.keypoints[10];
      const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
      if (elbowAngle > UP_THRESHOLD) {
        console.log("Calibration successful: User is in top push-up position");
        return true;
      } else {
        feedbackHistory.set("Get in top pushup position (arms extended)", {
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
  const startTime = performance.now();
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuad(progress);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawLoadingBar(easedProgress);
    drawFeedback();
    if (progress < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      console.log("Loading bar animation complete");
      countdownStarted = true;
      countdownStartTime = Date.now();
      exerciseState = "counting";
      startBtn.textContent = "Running";
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

async function startRecording(stream) {
  try {
    recordedChunks = [];
    const options = { mimeType: "video/webm;codecs=vp9" };
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "workout.webm");

      try {
        const response = await fetch("http://localhost:3002/api/upload-video", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          console.log("Video saved successfully:", result.filename);
        }
      } catch (error) {
        console.error("Error uploading video:", error);
      }
    };

    mediaRecorder.start(1000); // Record in 1-second chunks
    isRecording = true;
    console.log("Recording started");
  } catch (error) {
    console.error("Error starting recording:", error);
  }
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
    await startRecording(stream); // Start recording immediately
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
  if (countdownStarted && exerciseState === "counting") {
    const elapsed = (Date.now() - countdownStartTime) / 1000;
    const secondsLeft = Math.max(0, Math.ceil(COUNTDOWN_DURATION - elapsed));
    if (secondsLeft > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawCountdown(secondsLeft);
      drawFeedback();
      rafId = requestAnimationFrame(detectPose);
      return;
    } else {
      countdownStarted = false;
    }
  }
  rafId = requestAnimationFrame(detectPose);
}

function processDetection(keypoints) {
  sessionData.frame_count.push(sessionData.frame_count.length);
  const requiredLandmarks = [5, 6, 7, 8, 9, 10];
  const visibleLandmarks = requiredLandmarks.filter(
    (idx) => keypoints[idx].score > 0.2
  );

  if (visibleLandmarks.length >= requiredLandmarks.length - 1) {
    detectionFound = true;
    const rightShoulder = keypoints[6];
    const rightElbow = keypoints[8];
    const rightWrist = keypoints[10];
    const leftShoulder = keypoints[5];
    const leftElbow = keypoints[7];
    const leftWrist = keypoints[9];

    const rightElbowAngle = calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rawElbowAngle = (rightElbowAngle + leftElbowAngle) / 2;
    const elbowAngle = smoothAngle(rawElbowAngle, "elbow");

    // Track min/max angles for the current rep
    if (elbowAngle < minElbowAngleInCurrentRep) {
      minElbowAngleInCurrentRep = elbowAngle;
    }
    if (elbowAngle > maxElbowAngleInCurrentRep) {
      maxElbowAngleInCurrentRep = elbowAngle;
    }

    // Check T-shape form
    let elbowWidthRatio = 1.0;
    let isTShapeDetected = false;
    if (
      leftShoulder.score > 0.3 &&
      rightShoulder.score > 0.3 &&
      leftElbow.score > 0.3 &&
      rightElbow.score > 0.3
    ) {
      const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
      const elbowWidth = Math.abs(rightElbow.x - leftElbow.x);
      if (shoulderWidth > 10) {
        elbowWidthRatio = elbowWidth / shoulderWidth;
        sessionData.elbow_width_ratios.push(elbowWidthRatio);
        if (
          elbowWidthRatio > ELBOW_WIDTH_THRESHOLD &&
          elbowAngle <= DOWN_THRESHOLD
        ) {
          isTShapeDetected = true;
          tShapeDetectedInRep = true;
        }
      }
    }

    // State machine logic from Python
    const currentTime = Date.now();
    const timeInCurrentState = currentTime - stateStartTime;

    if (
      currentState === UP_POSITION &&
      elbowAngle < UP_THRESHOLD &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = GOING_DOWN;
      stateStartTime = currentTime;
      tShapeDetectedInRep = false;
      minElbowAngleInCurrentRep = elbowAngle;
      maxElbowAngleInCurrentRep = elbowAngle;
      console.log("Starting rep - going down");
    } else if (
      currentState === GOING_DOWN &&
      elbowAngle < DOWN_THRESHOLD &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = DOWN_POSITION;
      stateStartTime = currentTime;
      console.log("Reached bottom position");
    } else if (
      currentState === DOWN_POSITION &&
      elbowAngle > DOWN_THRESHOLD &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      currentState = GOING_UP;
      stateStartTime = currentTime;
      console.log("Starting to go up");
    } else if (
      currentState === GOING_UP &&
      elbowAngle > UP_THRESHOLD &&
      timeInCurrentState >= MIN_STATE_DURATION
    ) {
      // Complete rep validation
      const angleChange = maxElbowAngleInCurrentRep - minElbowAngleInCurrentRep;
      console.log(`Angle change in rep: ${angleChange.toFixed(1)}°`);

      if (angleChange > MIN_ANGLE_CHANGE_FOR_REP && !sessionComplete) {
        let isIncorrect = false;
        let incorrectReason = "";

        // Form validation - only check for T-shape
        if (tShapeDetectedInRep) {
          isIncorrect = true;
          incorrectReason = "Elbows out (T-shape)";
          improperElbowAngleCount++;
          console.log("T-shape detected during rep");
        }

        // Count the rep
        counter++;
        if (!isIncorrect) {
          correctReps++;
          sessionData.rep_feedback.push("Good form");
          console.log(
            `Good Rep Counted: Total=${counter}, Correct=${correctReps}`
          );
        } else {
          incorrectReps++;
          sessionData.rep_feedback.push(incorrectReason);
          console.log(
            `Incorrect Rep Counted: Total=${counter}, Incorrect=${incorrectReps}, Reason=${incorrectReason}`
          );
        }

        // Update UI
        repCounter.textContent = `Total: ${counter}`;
        correctCounter.textContent = `Good: ${correctReps}`;
        incorrectCounter.textContent = `Bad: ${incorrectReps}`;

        // Check session completion
        if (counter >= MAX_REPS_PER_SESSION && !sessionComplete) {
          sessionComplete = true;
          sessionCompletedTime = Date.now();

          // First stop the camera and exit fullscreen
          if (video.srcObject) {
            video.srcObject.getTracks().forEach((track) => track.stop());
          }

          // Stop the animation loop
          if (rafId) {
            cancelAnimationFrame(rafId);
          }

          // Save session data
          if (!sessionData.saved) {
            generateResultsFile();
            sessionData.saved = true;
          }

          // Exit fullscreen first
          exitFullscreenMode();

          // Show completion message after a short delay
          setTimeout(showSessionComplete, 500);

          return;
        }
      }

      // Reset for next rep
      currentState = UP_POSITION;
      stateStartTime = currentTime;
      minElbowAngleInCurrentRep = 180;
      maxElbowAngleInCurrentRep = 0;
      tShapeDetectedInRep = false;
      console.log("Reset for next rep");
    }

    // Update feedback based on current form
    if (elbowAngle > UP_THRESHOLD) {
      updateFeedbackState("form_depth", true, "Start going down", "#FFA500");
    } else if (elbowAngle > DOWN_THRESHOLD) {
      updateFeedbackState("form_depth", true, "Go deeper", "#FFA500");
    }

    // Update T-shape feedback
    updateFeedbackState(
      "improper_elbow",
      isTShapeDetected,
      "Keep elbows in! Avoid T-shape",
      "#FF0000"
    );

    sessionData.elbow_angles.push(elbowAngle);
    previousElbowAngle = elbowAngle;
    drawFeedback();
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
    console.log("Detection lost for too long, resetting trainer...");
    exerciseState = "waiting";
    currentState = UP_POSITION;
    positionFrames = 0;
    countdownStarted = false;
    console.log("Trainer reset due to detection loss");
  }
}

function drawPose(pose) {
  if (!pose || !pose.keypoints) return;
  const keypoints = pose.keypoints;
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];
    if (keypoint.score > 0.2 && [5, 6, 7, 8, 9, 10].includes(i)) {
      ctx.fillStyle = keypointColors[i];
      ctx.fillRect(keypoint.x - 4, keypoint.y - 4, 8, 8);
      ctx.fillStyle = "#FFFF00";
      ctx.fillRect(keypoint.x - 2, keypoint.y - 2, 4, 4);
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

  // Stop recording before stopping the camera
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    isRecording = false;
    console.log("Recording stopped");
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
    async function checkCalibration() {
      if (await calibratePose()) {
        await animateLoadingBar();
      } else {
        rafId = requestAnimationFrame(checkCalibration);
      }
    }
    rafId = requestAnimationFrame(checkCalibration);
    console.log("Push-up Trainer started, awaiting calibration");
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
exitFullscreenBtn.addEventListener("click", exitFullscreenMode);

function calculatePerformanceScore() {
  if (counter === 0) return 0;

  // Base score from correct reps percentage
  const repScore = (correctReps / counter) * 100;

  // Penalty for T-shape form issues (5 points per issue)
  const formPenalty = (improperElbowAngleCount / counter) * 5;

  // Calculate final score
  const finalScore = Math.max(0, Math.min(100, repScore - formPenalty));

  return Math.round(finalScore);
}

function createResultsObject() {
  const performanceScore = calculatePerformanceScore();
  const currentDate = new Date();
  const dateOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  };
  return {
    workoutName: "Push-up",
    date: currentDate.toLocaleDateString("en-US", dateOptions),
    time: currentDate.toLocaleTimeString("en-US", timeOptions),
    sets: 1,
    reps: { total: counter, correct: correctReps, incorrect: incorrectReps },
    formIssues: {
      improperElbowAngle: improperElbowAngleCount,
    },
    performanceScore: performanceScore,
    sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    sessionData: sessionData,
  };
}

function saveSessionData(resultsObject) {
  try {
    // Save to local file through server
    fetch("http://localhost:3000/api/save-workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resultsObject),
    })
      .then((response) => {
        console.log("Server response status:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          console.log(
            "Workout data saved to workout_history.json successfully"
          );
        } else {
          console.error("Error saving workout data to file");
        }
      })
      .catch((error) => {
        console.error("Error saving to file:", error);
        // Fallback to localStorage if server save fails
        try {
          localStorage.setItem("lastWorkout", JSON.stringify(resultsObject));
          console.log("Workout saved to localStorage as fallback");
        } catch (e) {
          console.error("Failed to save to localStorage:", e);
        }
      });

    return true;
  } catch (error) {
    console.error("Error in saveSessionData:", error);
    return false;
  }
}

// Remove the download functionality and just save to file
function generateResultsFile() {
  const resultsObject = createResultsObject();
  console.log("Saving workout data:", resultsObject);
  saveSessionData(resultsObject);
}

window.addEventListener("beforeunload", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    isRecording = false;
  }
  if (rafId) cancelAnimationFrame(rafId);
  if (video.srcObject)
    video.srcObject.getTracks().forEach((track) => track.stop());
  if (counter > 0) {
    // Only save if there were reps performed
    generateResultsFile();
  }
});

console.log("Push-up Trainer initialized. Press Start Camera to begin.");

// Update session completion logic
function showSessionComplete() {
  // Stop recording if it's still active
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    isRecording = false;
    console.log("Recording stopped at session completion");
  }

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
  document.getElementById("elbow-tshape").textContent = improperElbowAngleCount;

  // Calculate and update performance score
  const performanceScore = calculatePerformanceScore();
  document.getElementById("final-score").textContent = performanceScore + "%";

  // Show video saving status
  const videoStatus = document.createElement("div");
  videoStatus.className = "video-status";
  videoStatus.innerHTML = `
        <p>Saving workout video...</p>
        <div class="progress-bar">
            <div class="progress"></div>
        </div>
    `;
  sessionComplete.insertBefore(
    videoStatus,
    sessionComplete.querySelector(".next-btn")
  );

  // Animate progress bar
  const progressBar = videoStatus.querySelector(".progress");
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 5;
    progressBar.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(progressInterval);
      videoStatus.innerHTML = "<p>Workout video saved successfully!</p>";
      setTimeout(() => {
        videoStatus.remove();
      }, 2000);
    }
  }, 100);

  // Add event listener to next button
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      window.location.href = "/workoutFeedback"; // Simple page reload
    });
  }
}
