const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const detectionWarning = document.getElementById('detection-warning');
const repCounter = document.getElementById('rep-counter');
const correctCounter = document.getElementById('correct-counter');
const incorrectCounter = document.getElementById('incorrect-counter');
const feedback = document.getElementById('feedback');
const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
const videoContainer = document.querySelector('.video-container');
const counterContainer = document.getElementById('counter-container');

// Setup back button functionality
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        // Stop camera if it's running
        if (video?.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        window.location.href = '/workout';
    });
}

let isFullscreenMode = false;
let detector;
let rafId;

// Thresholds
const ELBOW_ANGLE_MIN = 85.0;
const ELBOW_ANGLE_MAX = 160.0;
const BACK_ANGLE_MIN = 143.6;
const BACK_ANGLE_MAX = 170.0;
const ELBOW_POSITION_MAJOR_THRESHOLD = 30.0;
const ELBOW_STABILITY_THRESHOLD = 45.0;
const BAD_ELBOW_STABILITY_THRESHOLD = 65.0;
const ELBOW_ANGLE_UP_THRESHOLD = ELBOW_ANGLE_MIN + 15;
const ELBOW_ANGLE_DOWN_THRESHOLD = ELBOW_ANGLE_MAX - 30;

// State management
let exerciseState = 'waiting';
let repState = 'up';
let repCounted = false;
let counter = 0;
let correctReps = 0;
let incorrectReps = 0;
let improperElbowAngleCount = 0;
let currentRepHasError = false;
let positionFrames = 0;
const POSITION_THRESHOLD = 30;
let countdownStarted = false;
let countdownStartTime = 0;
const COUNTDOWN_DURATION = 3000;
let lastRepTime = 0;
const MIN_TIME_BETWEEN_REPS = 500;
let detectionLostFrames = 0;
const MAX_DETECTION_LOST_FRAMES = 30;
let detectionFound = false;

// Smoothing and tracking
let landmarkHistory = {};
const SMOOTHING_FACTOR = 0.3;
let prevPositions = { elbow_x: null, elbow_y: null };
const elbowPositionsWindow = [];
const elbowMovementWindow = [];
const ELBOW_POS_WINDOW_SIZE = 30;
const MOVEMENT_WINDOW_SIZE = 6;
const MIN_CONSECUTIVE_FRAMES = 10;
const MIN_MOVEMENT_THRESHOLD = 25;

// Feedback persistence
let feedbackHistory = new Map();
const FEEDBACK_PERSISTENCE = 10;

// Session data
let sessionData = {
    frame_count: [],
    elbow_angles: [],
    back_angles: [],
    elbow_vertical_angles: [],
    elbow_x_positions: [],
    rep_markers: [],
    rep_elbow_angles: [],
    rep_back_angles: [],
    rep_elbow_vertical_angles: [],
    rep_elbow_stability: [],
    bad_rep_markers: [],
    rep_feedback: []
};

// Keypoint mappings
const keypointMap = {
    nose: 0, left_eye: 1, right_eye: 2, left_ear: 3, right_ear: 4,
    left_shoulder: 5, right_shoulder: 6, left_elbow: 7, right_elbow: 8,
    left_wrist: 9, right_wrist: 10, left_hip: 11, right_hip: 12,
    left_knee: 13, right_knee: 14, left_ankle: 15, right_ankle: 16
};
const keypointColors = Array(17).fill('#FF0000');
const connectedKeypoints = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_shoulder', 'right_hip'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
];

// Add swingingFrames to the state variables at the top
let swingingFrames = 0;

// Add this constant at the top with other constants
const MAX_REPS_PER_SESSION = 12;

// Add these variables at the top with other global variables
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

function smoothLandmarks(keypoints) {
    const smoothedKeypoints = [...keypoints];
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        const id = i;
        if (keypoint.score > 0.2) {
            const position = { x: keypoint.x, y: keypoint.y };
            if (landmarkHistory[id]) {
                const smoothedX = SMOOTHING_FACTOR * position.x + (1 - SMOOTHING_FACTOR) * landmarkHistory[id].x;
                const smoothedY = SMOOTHING_FACTOR * position.y + (1 - SMOOTHING_FACTOR) * landmarkHistory[id].y;
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
    const angleRad = Math.acos(Math.min(1, Math.max(-1, dot / (magAB * magCB))));
    return angleRad * (180 / Math.PI);
}

function calculateElbowStability(elbowXRel) {
    // Add current position to window
    elbowPositionsWindow.push(elbowXRel);
    
    if (elbowPositionsWindow.length > ELBOW_POS_WINDOW_SIZE) {
        elbowPositionsWindow.shift();
    }
    
    if (elbowPositionsWindow.length < 3) {
        return 0;
    }

    // Calculate moving average
    const movingAverage = elbowPositionsWindow.reduce((sum, val) => sum + val, 0) / elbowPositionsWindow.length;
    
    // Calculate variance with more weight on recent movements
    let weightedVariance = 0;
    let totalWeight = 0;
    
    elbowPositionsWindow.forEach((pos, index) => {
        const weight = (index + 1) * (index + 1);  // Square the weight to emphasize recent movements
        const diff = pos - movingAverage;
        weightedVariance += (diff * diff) * weight;
        totalWeight += weight;
    });
    
    weightedVariance = weightedVariance / totalWeight;
    
    // Significantly increase minimum variance threshold
    if (weightedVariance < 25) {  // Increased from 15
        return 0;
    }
    
    // Calculate range of movement
    const maxPos = Math.max(...elbowPositionsWindow);
    const minPos = Math.min(...elbowPositionsWindow);
    const range = maxPos - minPos;
    
    // If range is below minimum threshold, ignore it
    if (range < MIN_MOVEMENT_THRESHOLD) {
        return 0;
    }
    
    // Add to movement window
    elbowMovementWindow.push(range);
    if (elbowMovementWindow.length > MOVEMENT_WINDOW_SIZE) {
        elbowMovementWindow.shift();
    }
    
    // Calculate weighted average with heavy bias towards stability
    let weightedSum = 0;
    let weightSum = 0;
    
    elbowMovementWindow.forEach((value, index) => {
        const weight = (index + 1) * (index + 1);  // Square the weights
        weightedSum += value * weight;
        weightSum += weight;
    });
    
    const weightedAverage = weightedSum / weightSum;
    
    // Apply stronger dampening
    return weightedAverage * 0.6;  // Increased dampening from 0.8 to 0.6 (40% reduction)
}

function drawArrow(ctx, startPoint, endPoint, color, thickness = 3) {
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    const headLength = 15;
    ctx.beginPath();
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(endPoint.x - headLength * Math.cos(angle - Math.PI / 6), endPoint.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endPoint.x - headLength * Math.cos(angle + Math.PI / 6), endPoint.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawFeedback() {
    // Remove requestAnimationFrame to make feedback immediate
    // Remove expired messages
    const expiredMessages = [];
    feedbackHistory.forEach((item, text) => {
        item.count--;
        if (item.count <= 0) expiredMessages.push(text);
    });
    expiredMessages.forEach(text => feedbackHistory.delete(text));

    // If no messages, hide feedback area
    if (feedbackHistory.size === 0) {
        feedback.classList.add('hidden');
        feedback.innerHTML = '';
        return;
    }

    // Show feedback area and create messages
    feedback.classList.remove('hidden');
    feedback.innerHTML = '';  // Clear existing messages

    feedbackHistory.forEach((item, text) => {
        const div = document.createElement('div');
        div.style.color = item.color;
        div.textContent = text;
        feedback.appendChild(div);
    });
}

function drawLoadingBar(progress) {
    ctx.save();
    ctx.fillStyle = '#4CAF50';
    const barHeight = 20;
    const barWidth = canvas.width * progress;
    ctx.fillRect(0, canvas.height - barHeight, barWidth, barHeight);
    ctx.restore();
}

async function calibratePose() {
    if (!detector || !video.readyState || video.readyState < 2) {
        return false;
    }
    try {
        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (poses && poses.length > 0) {
            const pose = poses[0];
            if (pose.keypoints && pose.keypoints.length > 0) {
                const keypoints = pose.keypoints;
                const elbowAngle = calculateAngle(
                    keypoints[keypointMap[useRightSide ? 'right_shoulder' : 'left_shoulder']],
                    keypoints[keypointMap[useRightSide ? 'right_elbow' : 'left_elbow']],
                    keypoints[keypointMap[useRightSide ? 'right_wrist' : 'left_wrist']]
                );
                if (elbowAngle < ELBOW_ANGLE_UP_THRESHOLD + 20) {
                    console.log('Calibration successful: User is in starting position with arms bent');
                    return true;
                } else {
                    feedbackHistory.set('Get in position (arms bent)', { color: '#FFA500', count: FEEDBACK_PERSISTENCE });
                    drawFeedback();
                }
            }
        }
    } catch (error) {
        console.error('Error during calibration:', error);
    }
    return false;
}

async function animateLoadingBar() {
    const duration = 1000;
    const startTime = performance.now();
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - (1 - progress) * (1 - progress);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawLoadingBar(easedProgress);
        drawFeedback();
        if (progress < 1) {
            rafId = requestAnimationFrame(animate);
        } else {
            isCalibrating = false;
            startBtn.textContent = 'Running';
            detectPose();
        }
    }
    rafId = requestAnimationFrame(animate);
}

async function setupDetector() {
    try {
        if (typeof poseDetection === 'undefined') {
            throw new Error('Pose detection library not loaded');
        }
        const modelType = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType,
            enableSmoothing: true
        });
        console.log('MoveNet model loaded successfully');
    } catch (error) {
        console.error('Error setting up detector:', error);
        throw error;
    }
}

async function setupCamera() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const constraints = {
        video: {
            facingMode: 'user',
            width: { ideal: isMobile ? 1280 : 1920 },
            height: { ideal: isMobile ? 720 : 1080 }
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.style.transform = 'scaleX(-1)';
                canvas.style.transform = 'scaleX(-1)';
                video.style.objectFit = 'cover';
                canvas.style.objectFit = 'cover';
                document.body.classList.add('camera-initialized');
                console.log(`Camera dimensions: ${canvas.width}x${canvas.height}`);
                resolve(video);
            };
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
        alert('Error accessing webcam. Please ensure a webcam is connected and permissions are granted.');
        throw error;
    }
}

const TARGET_FPS = 30;
let lastDetectionTime = 0;
let useRightSide = true;
let isCalibrating = false;

async function detectPose() {
    const now = performance.now();
    if (now - lastDetectionTime < 1000 / TARGET_FPS) {
        rafId = requestAnimationFrame(detectPose);
        return;
    }
    lastDetectionTime = now;
    if (!detector || !video.readyState || video.readyState < 2) {
        rafId = requestAnimationFrame(detectPose);
        return;
    }
    detectionFound = false;
    try {
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
            detectionWarning.classList.add('hidden');
            detectionLostFrames = 0;
        }
    } catch (error) {
        console.error('Error detecting pose:', error);
    }
    rafId = requestAnimationFrame(detectPose);
}

function getMostVisibleSide(keypoints) {
    const leftVisibility = (
        keypoints[keypointMap['left_shoulder']].score +
        keypoints[keypointMap['left_elbow']].score +
        keypoints[keypointMap['left_wrist']].score +
        keypoints[keypointMap['left_hip']].score
    );
    
    const rightVisibility = (
        keypoints[keypointMap['right_shoulder']].score +
        keypoints[keypointMap['right_elbow']].score +
        keypoints[keypointMap['right_wrist']].score +
        keypoints[keypointMap['right_hip']].score
    );
    
    return {
        isRightSide: rightVisibility >= leftVisibility,
        score: Math.max(leftVisibility, rightVisibility) / 4  // Average score (4 points)
    };
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
            ctx.strokeStyle = '#00FF00';
            ctx.beginPath();
            ctx.moveTo(keypointA_obj.x, keypointA_obj.y);
            ctx.lineTo(keypointB_obj.x, keypointB_obj.y);
            ctx.stroke();
        }
    });
}

function processDetection(keypoints) {
    // Clear feedback at start of each frame
    feedbackHistory.clear();
    feedback.innerHTML = '';
    
    sessionData.frame_count.push(sessionData.frame_count.length);
    const requiredLandmarks = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const visibleLandmarks = requiredLandmarks.filter(idx => keypoints[idx].score > 0.2);
    if (visibleLandmarks.length >= requiredLandmarks.length - 1) {
        detectionFound = true;
        const leftVisibility = keypoints[5].score + keypoints[7].score + keypoints[9].score;
        const rightVisibility = keypoints[6].score + keypoints[8].score + keypoints[10].score;
        useRightSide = rightVisibility >= leftVisibility;

        const shoulder = keypoints[keypointMap[useRightSide ? 'right_shoulder' : 'left_shoulder']];
        const elbow = keypoints[keypointMap[useRightSide ? 'right_elbow' : 'left_elbow']];
        const wrist = keypoints[keypointMap[useRightSide ? 'right_wrist' : 'left_wrist']];
        const hip = keypoints[keypointMap[useRightSide ? 'right_hip' : 'left_hip']];
        const knee = keypoints[keypointMap[useRightSide ? 'right_knee' : 'left_knee']];
        const ankle = keypoints[keypointMap[useRightSide ? 'right_ankle' : 'left_ankle']];

        const elbowAngle = calculateAngle(shoulder, elbow, wrist);
        const backAngle = calculateAngle(shoulder, hip, ankle);
        const verticalPoint = { x: elbow.x, y: elbow.y - 100 };
        const dx1 = shoulder.x - elbow.x;
        const dy1 = shoulder.y - elbow.y;
        const dx2 = verticalPoint.x - elbow.x;
        const dy2 = verticalPoint.y - elbow.y;
        const dot = dx1 * dx2 + dy1 * dy2;
        const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        let elbowVerticalAngle = mag1 * mag2 === 0 ? 0 : Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2)))) * (180 / Math.PI);
        if ((useRightSide && shoulder.x < elbow.x) || (!useRightSide && shoulder.x > elbow.x)) {
            elbowVerticalAngle = 180 - elbowVerticalAngle;
        }
        const elbowXRel = elbow.x - shoulder.x;
        const elbowXMovement = calculateElbowStability(elbowXRel);

        sessionData.elbow_angles.push(elbowAngle);
        sessionData.back_angles.push(backAngle);
        sessionData.elbow_vertical_angles.push(elbowVerticalAngle);
        sessionData.elbow_x_positions.push(elbowXMovement);

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(elbow.x, elbow.y);
        ctx.lineTo(wrist.x, wrist.y);
        ctx.stroke();
        ctx.strokeStyle = '#FFC107';
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(hip.x, hip.y);
        ctx.lineTo(knee.x, knee.y);
        ctx.lineTo(ankle.x, ankle.y);
        ctx.stroke();

        if (exerciseState === 'waiting') {
            if (elbowAngle < ELBOW_ANGLE_UP_THRESHOLD + 20) {
                positionFrames++;
                const progress = Math.min(1, positionFrames / POSITION_THRESHOLD);
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(canvas.width / 2 - 100, 100, 200 * progress, 20);
                if (positionFrames >= POSITION_THRESHOLD && !countdownStarted) {
                    countdownStarted = true;
                    countdownStartTime = performance.now();
                }
            } else {
                positionFrames = Math.max(0, positionFrames - 2);
                countdownStarted = false;
                feedbackHistory.set('Get in position (arms bent)', { color: '#FFA500', count: FEEDBACK_PERSISTENCE });
            }
            if (countdownStarted) {
                const elapsed = performance.now() - countdownStartTime;
                const secondsLeft = Math.max(0, Math.ceil((COUNTDOWN_DURATION - elapsed) / 1000));
                if (secondsLeft > 0) {
                    // Save current transform state
                    ctx.save();
                    
                    // Translate to center, scale to flip, translate back
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    
                    ctx.font = '100px Arial';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textAlign = 'center';
                    ctx.fillText(secondsLeft, canvas.width / 2, canvas.height / 2);
                    
                    ctx.font = '30px Arial';
                    ctx.fillStyle = '#4CAF50';
                    ctx.fillText('Get ready!', canvas.width / 2, canvas.height / 2 - 60);
                    
                    // Restore the original transform state
                    ctx.restore();
                } else {
                    exerciseState = 'counting';
                    console.log('Starting to count reps!');
                }
            }
        }

        if (exerciseState === 'counting') {
            let currentRepErrors = [];
            let hasError = false;
            let errorThisFrame = false;
            
            // Check back angle
            if (backAngle > BACK_ANGLE_MAX) {
                const midback = { x: (shoulder.x + hip.x) / 2, y: (shoulder.y + hip.y) / 2 };
                const forwardPoint = { x: midback.x + (useRightSide ? 50 : -50), y: midback.y + 30 };
                drawArrow(ctx, midback, forwardPoint, '#FF0000', 4);
                feedbackHistory.set('Bend your back slightly forward', { color: '#FF0000', count: 2 });
                currentRepErrors.push("Back too straight");
                hasError = true;
                errorThisFrame = true;
            } else if (backAngle < BACK_ANGLE_MIN) {
                const midback = { x: (shoulder.x + hip.x) / 2, y: (shoulder.y + hip.y) / 2 };
                const upPoint = { x: midback.x, y: midback.y - 50 };
                drawArrow(ctx, midback, upPoint, '#FF0000', 4);
                feedbackHistory.set('Straighten your back a bit', { color: '#FF0000', count: 2 });
                currentRepErrors.push("Back too tilted");
                hasError = true;
                errorThisFrame = true;
            }

            // Check elbow swinging
            if (repState === 'down' || (repState === 'up' && elbowAngle > ELBOW_ANGLE_UP_THRESHOLD)) {
                const elbowStability = calculateElbowStability(elbowXRel);
                
                if (elbowStability > ELBOW_STABILITY_THRESHOLD) {
                    const sidePoint = { x: elbow.x + (useRightSide ? -50 : 50), y: elbow.y };
                    drawArrow(ctx, elbow, sidePoint, '#FF0000', 4);
                    feedbackHistory.set('Stop swinging elbows!', { color: '#FF0000', count: 2 });
                    currentRepErrors.push("Elbow swinging detected");
                    hasError = true;
                    errorThisFrame = true;
                }
            }

            // State machine for rep counting
            if (repState === 'up' && elbowAngle > ELBOW_ANGLE_DOWN_THRESHOLD) {
                repState = 'down';
                console.log(`State change: up -> down (angle: ${elbowAngle.toFixed(1)})`);
                
                // Only count the rep once when transitioning from up to down
                if (!repCounted && (performance.now() - lastRepTime) > MIN_TIME_BETWEEN_REPS) {
                    repCounted = true;
                    counter++;
                    lastRepTime = performance.now();
                    
                    // Check for max reps
                    if (counter >= MAX_REPS_PER_SESSION && !sessionData.saved) {
                        console.log("Session complete! Counter:", counter, "Correct reps:", correctReps, "Incorrect reps:", incorrectReps);
                        
                        // Stop the camera processing
                        if (rafId) {
                            cancelAnimationFrame(rafId);
                            rafId = null;
                        }

                        // First close the camera
                        exitFullscreenMode();
                        
                        // Then save workout data and show completion screen after a short delay
                        setTimeout(() => {
                            saveWorkoutData();
                        }, 500);
                        
                        exerciseState = 'completed';
                        return;
                    }
                    
                    // If this rep had any errors, count it as a bad rep now that it's complete
                    if (hasError && !currentRepHasError) {
                        incorrectReps++;
                        currentRepHasError = true;
                        // Only increment specific error counters when the rep is actually completed
                        if (currentRepErrors.includes("Back too straight")) {
                            improperElbowAngleCount++;
                        }
                        if (currentRepErrors.includes("Back too tilted")) {
                            improperElbowAngleCount++;
                        }
                        if (currentRepErrors.includes("Elbow swinging detected")) {
                            improperElbowAngleCount++;
                        }
                        incorrectCounter.textContent = `Incorrect Reps: ${incorrectReps}`;
                    }
                    
                    // Update rep counter immediately
                    repCounter.textContent = `Total: ${counter}`;
                    
                    // Store rep data with specific form issues
                    sessionData.rep_markers.push(sessionData.frame_count.length);
                    sessionData.rep_elbow_angles.push(elbowAngle);
                    sessionData.rep_back_angles.push(backAngle);
                    sessionData.rep_elbow_vertical_angles.push(elbowVerticalAngle);
                    sessionData.rep_elbow_stability.push(elbowXMovement);
                    
                    // Store the specific form issues for this rep
                    if (currentRepErrors.length > 0) {
                        sessionData.rep_feedback.push(currentRepErrors.join(", "));
                    } else {
                        sessionData.rep_feedback.push("Good form");
                    }
                }
            } else if (repState === 'down' && elbowAngle < ELBOW_ANGLE_UP_THRESHOLD) {
                repState = 'up';
                repCounted = false;
                currentRepHasError = false; // Reset error state for new rep
                currentRepErrors = []; // Reset errors for new rep
                hasError = false; // Reset overall error flag
                console.log(`State change: down -> up (angle: ${elbowAngle.toFixed(1)})`);
            }

            if (!errorThisFrame && !currentRepHasError) {
                feedbackHistory.set('Good form!', { color: '#4CAF50', count: FEEDBACK_PERSISTENCE });
            }

            // Draw feedback immediately if there are messages
            if (feedbackHistory.size > 0) {
                drawFeedback();
            }
        }
    } else {
        detectionFound = false;
    }
}

function handleDetectionLoss() {
    detectionLostFrames++;
    if (detectionLostFrames >= MAX_DETECTION_LOST_FRAMES) {
        detectionWarning.classList.remove('hidden');
        console.log('Detection lost for too long, resetting trainer...');
        exerciseState = 'waiting';
        repState = 'up';
        positionFrames = 0;
        countdownStarted = false;
        repCounted = false;
    }
}

function resetTrainer() {
    if (counter > 0) {
        saveWorkoutData();
    }
    
    counter = 0;
    correctReps = 0;
    incorrectReps = 0;
    improperElbowAngleCount = 0;
    currentRepHasError = false;
    repCounted = false;
    repState = 'up';
    exerciseState = 'waiting';
    positionFrames = 0;
    countdownStarted = false;
    detectionLostFrames = 0;
    feedbackHistory.clear();
    feedback.classList.add('hidden');
    repCounter.textContent = `Total: ${counter}`;
    incorrectCounter.textContent = `Incorrect Reps: ${incorrectReps}`;
    counterContainer.classList.remove('hidden');
    sessionData = {
        frame_count: [],
        elbow_angles: [],
        back_angles: [],
        elbow_vertical_angles: [],
        elbow_x_positions: [],
        rep_markers: [],
        rep_elbow_angles: [],
        rep_back_angles: [],
        rep_elbow_vertical_angles: [],
        rep_elbow_stability: [],
        bad_rep_markers: [],
        rep_feedback: []
    };
    console.log('Trainer reset');
}

function enterFullscreenMode() {
    if (isFullscreenMode) return;
    document.body.classList.add('fullscreen-mode');
    exitFullscreenBtn.classList.remove('hidden');
    isFullscreenMode = true;
    if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen().catch(err => console.log('Error enabling fullscreen:', err));
    }
}

function exitFullscreenMode() {
    if (!isFullscreenMode) return;
    document.body.classList.remove('fullscreen-mode');
    document.body.classList.remove('camera-active');
    exitFullscreenBtn.classList.add('hidden');
    isFullscreenMode = false;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Error exiting fullscreen:', err));
    }
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    startBtn.disabled = false;
    startBtn.textContent = 'Start Camera';
}

async function startApp() {
    try {
        startBtn.disabled = true;
        startBtn.textContent = 'Loading...';
        if (!navigator.mediaDevices) {
            throw new Error('Webcam access is not supported in this browser');
        }
        await tf.setBackend('webgl');
        await tf.ready();
        if (!detector) await setupDetector();
        if (!video.srcObject) await setupCamera();
        document.body.classList.add('camera-active');
        enterFullscreenMode();
        video.play();
        async function checkCalibration() {
            if (await calibratePose()) {
                await animateLoadingBar();
            } else {
                rafId = requestAnimationFrame(checkCalibration);
            }
        }
        setTimeout(() => {
            rafId = requestAnimationFrame(checkCalibration);
        }, 500);
        console.log('Tricep Pushdown Trainer started, awaiting calibration');
    } catch (error) {
        console.error('Error starting the application:', error);
        startBtn.disabled = false;
        startBtn.textContent = 'Start Camera';
        let errorMessage = 'Error starting the application: ' + error.message;
        if (error.message.includes('permission')) {
            errorMessage += '\nPlease grant webcam permissions in your browser settings and try again.';
        } else if (error.message.includes('webcam')) {
            errorMessage += '\nPlease ensure a webcam is connected and not in use by another application.';
        }
        alert(errorMessage);
    }
}

function showSessionComplete() {
    // Hide the video container and controls
    document.querySelector('.video-container').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';

    const sessionComplete = document.getElementById('session-complete');
    sessionComplete.classList.remove('hidden');

    // Update statistics
    document.getElementById('final-total-reps').textContent = counter;
    document.getElementById('final-good-form').textContent = correctReps;
    document.getElementById('final-bad-form').textContent = incorrectReps;
    
    // Update form issues with correct IDs
    document.getElementById('elbow-swinging').textContent = improperElbowAngleCount;
    document.getElementById('back-too-straight').textContent = '0';  // Add tracking if needed
    document.getElementById('back-too-tilted').textContent = '0';    // Add tracking if needed
    
    // Calculate and update performance score
    const performanceScore = calculatePerformanceScore();
    document.getElementById('final-score').textContent = performanceScore + '%';

    // Add event listener to next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            window.location.href = '/workoutFeedback';
        });
    }
}

function cleanupSession() {
    // Stop video tracks
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // Cancel animation frame
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    
    // Exit fullscreen if needed
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Error exiting fullscreen:', err));
    }
}

async function saveWorkoutData() {
    if (!sessionData.saved) {
        const workoutData = createResultsObject();
        try {
            // Clean up resources first
            cleanupSession();
            
            // Save to localStorage
            saveSessionData(workoutData);
            sessionData.saved = true;
            console.log('Workout data saved successfully');
            
            // Show session complete screen
            showSessionComplete();
        } catch (error) {
            console.error('Error saving workout data:', error);
        }
    }
}

function checkSessionComplete() {
    if (counter >= MAX_REPS_PER_SESSION && !sessionData.saved) {
        saveWorkoutData();
    }
}

startBtn.addEventListener('click', startApp);
exitFullscreenBtn.addEventListener('click', exitFullscreenMode);

window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
    if (counter > 0) {
        generateResultsFile();
    }
});

console.log('Tricep Pushdown Trainer initialized. Press Start Camera to begin.');

function calculatePerformanceScore() {
    if (counter === 0) return 0;
    return Math.round(((correctReps / counter) * 100)) || 0;
}

function createResultsObject() {
    const performanceScore = calculatePerformanceScore();
    const currentDate = new Date();
    const dateOptions = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        timeZone: 'UTC'
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'UTC'
    };

    return {
        workoutName: "Tricep",
        date: currentDate.toLocaleDateString('en-US', dateOptions),
        time: currentDate.toLocaleTimeString('en-US', timeOptions),
        sets: 1,
        reps: {
            total: counter,
            correct: correctReps,
            incorrect: incorrectReps
        },
        formIssues: {
            elbowSwinging: improperElbowAngleCount,
            backTooTilted: 0,
            backTooStraight: 0
        },
        performanceScore: performanceScore,
        sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        sessionData: {
            rep_feedback: sessionData.rep_feedback,
            saved: true
        }
    };
}

function saveSessionData(resultsObject) {
    try {
        // Save to localStorage with the specified structure
        localStorage.setItem('workoutBackup', JSON.stringify(resultsObject));
        console.log('Workout data saved to localStorage under "workoutBackup"');
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

// Remove the download functionality and just save to file
function generateResultsFile() {
    const resultsObject = createResultsObject();
    console.log('Saving workout data:', resultsObject);
    saveSessionData(resultsObject);
}