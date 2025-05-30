import cv2
import numpy as np
import time
import PE_module as pm
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
from datetime import datetime
import mediapipe as mp
import gc  # Garbage collector
import threading  # For background graph creation
import math
from collections import deque  # For rolling window calculation

# MediaPipe utilities for full body drawing
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_pose = mp.solutions.pose

# Use webcam instead of video file
print("Starting Webcam Tricep Pushdown Trainer...")
print("Press 'q' to exit")
cap = cv2.VideoCapture(0)  # Use webcam (0 is usually the built-in webcam)

# Check if webcam opened successfully
if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

pose = pm.poseDetection(min_detection_confidence=0.8, min_tracking_confidence=0.7)
counter = 0
direction = 0

# Define the desired dimensions for resizing
width = 1280
height = 720

# Create a resizable window
cv2.namedWindow("Webcam Tricep Pushdown Trainer", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Webcam Tricep Pushdown Trainer", width, height)

# Thresholds for good form - Based on analysis results
ELBOW_ANGLE_MIN = 85.0  # Threshold for bent arms (loosened from 89.6)
ELBOW_ANGLE_MAX = 160.0  # Threshold for extended arms (loosened from 168.8)
BACK_ANGLE_MIN = 143.6  # Minimum back angle (more tilted forward)
# Reduce the maximum back angle threshold to encourage a slightly bent back
BACK_ANGLE_MAX = 170.0  # Maximum back angle (more upright) - reduced from 176.7
ELBOW_POSITION_MINOR_THRESHOLD = 10  # Minor elbow forward lean (acceptable)
ELBOW_POSITION_MAJOR_THRESHOLD = 30  # Major elbow forward lean (form issue) (loosened from 20)

# Elbow swinging detection thresholds
ELBOW_STABILITY_THRESHOLD = 15.0  # Maximum acceptable elbow movement
BAD_ELBOW_STABILITY_THRESHOLD = 30.0  # Threshold for major elbow swinging

# Variables for rep detection
rep_state = "up"  # Track state of the movement: "up" = arms bent, "down" = arms extended
elbow_angle_up_threshold = ELBOW_ANGLE_MIN + 15  # Angle below this is considered "up" position (loosened from +10)
elbow_angle_down_threshold = ELBOW_ANGLE_MAX - 30  # Angle above this is considered "down" position (loosened from -20)
rep_counted = False  # Flag to prevent double counting
counter = 0  # Count of reps
last_rep_time = 0  # Time when last rep was counted
min_time_between_reps = 0.5  # Minimum seconds between reps

# Exercise state management
exercise_state = "waiting"  # "waiting" -> "ready" -> "counting"
position_frames = 0  # Number of consecutive frames user has been in position
position_threshold = 30  # Need this many frames in position to start counting
countdown_started = False
countdown_start_time = 0
countdown_duration = 3  # seconds

# Detection loss tracking
detection_lost_frames = 0
max_detection_lost_frames = 30  # Reset trainer after this many frames with lost detection
detection_found = False  # Flag to track if detection was found in the current frame

# Track form issues
form_issues = {
    "elbow_not_extended": 0,
    "back_too_straight": 0,
    "back_too_tilted": 0,
    "elbow_leaning_forward": 0,  # New issue to track
    "elbow_swinging": 0  # Added for swinging detection
}

# Data collection for visualizations
session_data = {
    "frame_count": [],
    "elbow_angles": [],
    "back_angles": [],   # Measure of back tilt
    "elbow_vertical_angles": [],  # Data to track elbow verticality
    "elbow_x_positions": [],  # Track elbow horizontal position for stability
    "rep_markers": [],   # Frames where reps are completed
    "rep_elbow_angles": [], # Elbow extension at end of rep
    "rep_back_angles": [], # Back tilt during rep
    "rep_elbow_vertical_angles": [],  # Elbow verticality during reps
    "rep_elbow_stability": []  # Added for tracking swinging during reps
}

# Store previous positions for tracking movement
prev_positions = {
    "elbow_x": None,
    "elbow_y": None
}

# Add rolling window for elbow position tracking (for swinging detection)
elbow_positions_window = deque(maxlen=30)  # Track last 30 frames
elbow_movement_window = deque(maxlen=20)   # Track last 20 movement calculations

# Add smoothing for landmark positions
landmark_history = {}
smoothing_factor = 0.3  # Lower = less smoothing (more responsive)

# Function to smooth landmark positions
def smooth_landmarks(lmList):
    global landmark_history
    smoothed_lmList = []
    
    for lm in lmList:
        lm_id = lm[0]
        current_pos = (lm[1], lm[2])
        
        if lm_id in landmark_history:
            # Apply exponential smoothing
            smoothed_x = smoothing_factor * current_pos[0] + (1 - smoothing_factor) * landmark_history[lm_id][0]
            smoothed_y = smoothing_factor * current_pos[1] + (1 - smoothing_factor) * landmark_history[lm_id][1]
            smoothed_pos = (int(smoothed_x), int(smoothed_y))
            landmark_history[lm_id] = smoothed_pos
        else:
            # First time seeing this landmark
            smoothed_pos = current_pos
            landmark_history[lm_id] = current_pos
        
        smoothed_lmList.append([lm_id, smoothed_pos[0], smoothed_pos[1]])
    
    return smoothed_lmList

# Function to calculate elbow stability using rolling window
def calculate_elbow_stability(elbow_x_rel):
    # Add current position to window
    elbow_positions_window.append(elbow_x_rel)
    
    # Need at least 3 points to calculate meaningful movement
    if len(elbow_positions_window) < 3:
        return 0
    
    # Calculate movement over the window
    max_pos = max(elbow_positions_window)
    min_pos = min(elbow_positions_window)
    range_of_movement = max_pos - min_pos
    
    # Add to movement window for consistent detection
    elbow_movement_window.append(range_of_movement)
    
    # Return the average movement over the last several frames
    return sum(elbow_movement_window) / len(elbow_movement_window)

# Function to draw an arrow
def draw_arrow(img, start_point, end_point, color, thickness=3, arrow_size=10):
    cv2.arrowedLine(img, start_point, end_point, color, thickness, tipLength=0.5)
    return img

# Function to draw feedback text at bottom of screen
def draw_bottom_feedback(img, messages):
    # Create a semi-transparent black bar at the bottom
    h, w = img.shape[:2]
    overlay = img.copy()
    cv2.rectangle(overlay, (0, h-80), (w, h), (0, 0, 0), -1)
    
    # Apply the overlay with transparency
    alpha = 0.7
    cv2.addWeighted(overlay, alpha, img, 1-alpha, 0, img)
    
    # Calculate vertical positions for text based on number of messages
    y_offset = h - 25 * len(messages) - 10
    
    for i, (text, color) in enumerate(messages):
        text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        x = (w - text_size[0]) // 2  # Center text
        y = y_offset + i * 30
        cv2.putText(img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    return img

def create_session_graphs(session_data, results_dir=None):
    """Create interactive graphs of the training session using Plotly"""
    print("\nCreating session graphs...")
    print(f"Data points: {len(session_data['frame_count'])}")
    print(f"Reps detected: {len(session_data['rep_markers'])}")
    
    # Don't try to create graphs if we don't have enough data
    if len(session_data['frame_count']) < 10:
        print("Not enough data to create meaningful graphs.")
        return False
    
    try:
        # Create a subplot with 3 rows (added one for elbow vertical angle)
        fig = make_subplots(
            rows=3, cols=1,
            subplot_titles=("Elbow Extension Angle", "Back Angle", "Elbow Vertical Position"),
            vertical_spacing=0.12
        )
        
        # Add traces for elbow angles
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"], 
                y=session_data["elbow_angles"],
                mode="lines",
                name="Elbow Angle",
                line=dict(color="royalblue", width=2)
            ),
            row=1, col=1
        )
        
        # Add horizontal lines for thresholds
        fig.add_shape(
            type="line", line=dict(dash="dash", color="green"),
            y0=ELBOW_ANGLE_MIN, y1=ELBOW_ANGLE_MIN, x0=0, x1=len(session_data["frame_count"]),
            row=1, col=1
        )
        
        fig.add_shape(
            type="line", line=dict(dash="dash", color="green"),
            y0=ELBOW_ANGLE_MAX, y1=ELBOW_ANGLE_MAX, x0=0, x1=len(session_data["frame_count"]),
            row=1, col=1
        )
        
        # Add rep markers as vertical lines
        for idx, frame in enumerate(session_data["rep_markers"]):
            fig.add_vline(
                x=frame, line_width=1, line_dash="solid", line_color="gray",
                row=1, col=1
            )
            # Add rep number annotation
            fig.add_annotation(
                x=frame, y=max(session_data["elbow_angles"]),
                text=f"Rep {idx+1}",
                showarrow=False,
                yshift=10,
                row=1, col=1
            )
        
        # Add trace for back angles
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"], 
                y=session_data["back_angles"],
                mode="lines",
                name="Back Angle",
                line=dict(color="orange", width=2)
            ),
            row=2, col=1
        )
        
        # Add horizontal lines for back angle thresholds
        fig.add_shape(
            type="line", line=dict(dash="dash", color="green"),
            y0=BACK_ANGLE_MIN, y1=BACK_ANGLE_MIN, x0=0, x1=len(session_data["frame_count"]),
            row=2, col=1
        )
        
        fig.add_shape(
            type="line", line=dict(dash="dash", color="green"),
            y0=BACK_ANGLE_MAX, y1=BACK_ANGLE_MAX, x0=0, x1=len(session_data["frame_count"]),
            row=2, col=1
        )
        
        # Add rep markers to back angle chart
        for frame in session_data["rep_markers"]:
            fig.add_vline(
                x=frame, line_width=1, line_dash="solid", line_color="gray",
                row=2, col=1
            )
        
        # Add trace for elbow vertical position
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"], 
                y=session_data["elbow_vertical_angles"],
                mode="lines",
                name="Elbow Verticality",
                line=dict(color="purple", width=2)
            ),
            row=3, col=1
        )
        
        # Add horizontal line for elbow position thresholds
        fig.add_shape(
            type="line", line=dict(dash="dash", color="orange"),
            y0=ELBOW_POSITION_MINOR_THRESHOLD, y1=ELBOW_POSITION_MINOR_THRESHOLD, x0=0, x1=len(session_data["frame_count"]),
            row=3, col=1
        )
        
        fig.add_shape(
            type="line", line=dict(dash="dash", color="red"),
            y0=ELBOW_POSITION_MAJOR_THRESHOLD, y1=ELBOW_POSITION_MAJOR_THRESHOLD, x0=0, x1=len(session_data["frame_count"]),
            row=3, col=1
        )
        
        # Add rep markers to elbow vertical angle chart
        for frame in session_data["rep_markers"]:
            fig.add_vline(
                x=frame, line_width=1, line_dash="solid", line_color="gray",
                row=3, col=1
            )
        
        # Create table of rep data
        rep_table = go.Figure(data=[
            go.Table(
                header=dict(
                    values=["Rep #", "Elbow Extension", "Back Angle", "Elbow Position", "Status"],
                    fill_color="paleturquoise",
                    align="left"
                ),
                cells=dict(
                    values=[
                        list(range(1, len(session_data["rep_elbow_angles"])+1)),
                        [f"{angle:.1f}°" for angle in session_data["rep_elbow_angles"]],
                        [f"{angle:.1f}°" for angle in session_data["rep_back_angles"]],
                        [f"{angle:.1f}°" for angle in session_data["rep_elbow_vertical_angles"]],
                        [get_rep_quality(elbow, back, elbow_vert) for elbow, back, elbow_vert in 
                         zip(session_data["rep_elbow_angles"], session_data["rep_back_angles"],
                             session_data["rep_elbow_vertical_angles"])]
                    ],
                    fill_color="lavender",
                    align="left"
                )
            )
        ])
        
        rep_table.update_layout(
            title="Tricep Pushdown Rep Details",
            height=500,
            width=800
        )
        
        # Update layout with title and height
        fig.update_layout(
            title_text="Tricep Pushdown Training Session Analysis",
            height=800,
            width=1000,
            showlegend=True,
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01
            )
        )
        
        # Update y-axis labels
        fig.update_yaxes(title_text="Elbow Angle (degrees)", row=1, col=1)
        fig.update_yaxes(title_text="Back Angle (degrees)", row=2, col=1)
        fig.update_yaxes(title_text="Elbow Vertical Position (degrees)", row=3, col=1)
        
        # Update x-axis labels
        fig.update_xaxes(title_text="Frame Number", row=3, col=1)
        
        # Add annotations for statistics
        fig.add_annotation(
            xref="paper", yref="paper",
            x=0.5, y=1.05,
            text=f"Total Reps: {counter}",
            showarrow=False,
            font=dict(size=14)
        )
        
        # Add form issue summary
        form_text = (f"Form Issues: Elbow not extended: {form_issues['elbow_not_extended']}, " + 
                     f"Back too straight: {form_issues['back_too_straight']}, " +
                     f"Back too tilted: {form_issues['back_too_tilted']}, " +
                     f"Elbow leaning forward: {form_issues['elbow_leaning_forward']}, " +
                     f"Elbow swinging: {form_issues['elbow_swinging']}")
        
        fig.add_annotation(
            xref="paper", yref="paper",
            x=0.5, y=1.02,
            text=form_text,
            showarrow=False,
            font=dict(size=12)
        )
        
        # Create timestamp for file names
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create a directory for results if it doesn't exist
        if results_dir is None:
            results_dir = os.path.join("session_results", "tricep_pushdown")
        
        os.makedirs(results_dir, exist_ok=True)
        
        # Save graphs as HTML files
        try:
            file_path = os.path.join(results_dir, f"tricep_pushdown_analysis_{timestamp}.html")
            fig.write_html(file_path)
            print(f"\nSession analysis saved to '{file_path}'")
            
            details_path = os.path.join(results_dir, f"tricep_pushdown_details_{timestamp}.html")
            rep_table.write_html(details_path)
            print(f"Rep details saved to '{details_path}'")
            
            return True
        except Exception as e:
            print(f"Error saving HTML files: {e}")
            return False
            
    except Exception as e:
        print(f"Error creating graphs: {e}")
        return False

# Get rep quality evaluation
def get_rep_quality(elbow_angle, back_angle, elbow_vertical_angle=None):
    issues = []
    
    # Check elbow extension
    if elbow_angle < ELBOW_ANGLE_MAX:
        issues.append("Elbows not fully extended")
    
    # Check back position
    if back_angle < BACK_ANGLE_MIN:
        issues.append("Back too tilted")
    elif back_angle > BACK_ANGLE_MAX:
        issues.append("Back too straight")
        
    # Check elbow vertical position - only flag major tilting issues
    if elbow_vertical_angle is not None and elbow_vertical_angle > ELBOW_POSITION_MAJOR_THRESHOLD:
        issues.append("Elbow leaning too far forward")
    
    if not issues:
        return "Good form!"
    else:
        return ", ".join(issues)

# Background thread function for graph creation
def create_graphs_in_background(session_data):
    try:
        results_dir = os.path.join("session_results", "tricep_pushdown")
        os.makedirs(results_dir, exist_ok=True)
        
        success = create_session_graphs(session_data, results_dir)
        if success:
            print("\nSession graphs created successfully!")
        else:
            print("\nFailed to create session graphs.")
    except Exception as e:
        print(f"\nError in background graph creation: {e}")

# Resize the image
def resize_with_aspect_ratio(image, target_width=None, target_height=None):
    # Get original dimensions
    h, w = image.shape[:2]
    
    # If both width and height are None, return original image
    if target_width is None and target_height is None:
        return image
    
    # Calculate aspect ratio
    aspect = w / h
    
    # Determine new dimensions
    if target_width is None:
        # Calculate width from target height
        target_width = int(target_height * aspect)
    else:
        # Calculate height from target width
        target_height = int(target_width / aspect)
    
    # Resize the image
    return cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)

# Main video loop
try:
    while True:
        # Read a frame from the webcam
        success, img = cap.read()
        if not success:
            print("Failed to read from webcam.")
            break
            
        # Flip horizontally for a mirror effect
        img = cv2.flip(img, 1)
        
        # Get original dimensions
        orig_height, orig_width = img.shape[:2]
        
        # Resize the image while maintaining aspect ratio
        img = resize_with_aspect_ratio(img, target_width=width)
        
        # Reset detection found flag for this frame
        detection_found = False
        
        # Find pose and landmarks
        img = pose.findPose(img, draw=False)  # Process but don't draw pose yet
        
        # If we have pose results, draw the complete pose skeleton
        if pose.results.pose_landmarks:
            # Draw the full body connections using MediaPipe
            mp_drawing.draw_landmarks(
                img,
                pose.results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())
        
        # Get landmark positions
        lmList = pose.getPosition(img, draw=False)  # Don't draw individual landmarks
        
        if len(lmList) > 0:
            # Apply smoothing to landmarks
            lmList = smooth_landmarks(lmList)
            
            # Extract landmark positions for easier access
            landmark_dict = {lm[0]: (lm[1], lm[2]) for lm in lmList}
            
            # Check if we have the minimum required landmarks for our analysis
            required_landmarks = [11, 12, 13, 14, 15, 16]  # Both left and right shoulders, elbows, wrists
            
            if all(lm_id in landmark_dict for lm_id in required_landmarks):
                # Mark detection as found for this frame
                detection_found = True
                detection_lost_frames = 0  # Reset lost frame counter
                
                # Calculate key angles
                
                # Frame counter for visualization
                frame_count = len(session_data["frame_count"])
                session_data["frame_count"].append(frame_count)
                
                try:
                    # Determine which side (left or right) is more visible
                    # For tricep pushdown, we need shoulder, elbow, and wrist
                    left_visibility = 0
                    right_visibility = 0
                    
                    if pose.results.pose_landmarks:
                        left_visibility = (pose.results.pose_landmarks.landmark[11].visibility + 
                                          pose.results.pose_landmarks.landmark[13].visibility + 
                                          pose.results.pose_landmarks.landmark[15].visibility)
                                          
                        right_visibility = (pose.results.pose_landmarks.landmark[12].visibility + 
                                           pose.results.pose_landmarks.landmark[14].visibility + 
                                           pose.results.pose_landmarks.landmark[16].visibility)
                    
                    # Use the side with higher visibility
                    use_right_side = right_visibility >= left_visibility
                    
                    # Get elbow angle based on the most visible side
                    if use_right_side:
                        # Right side (shoulder-elbow-wrist)
                        elbow_angle = pose.getAngle(img, 12, 14, 16)
                        shoulder_lm = 12
                        elbow_lm = 14
                        wrist_lm = 16
                        hip_lm = 24
                        knee_lm = 26
                        ankle_lm = 28
                    else:
                        # Left side (shoulder-elbow-wrist)
                        elbow_angle = pose.getAngle(img, 11, 13, 15)
                        shoulder_lm = 11
                        elbow_lm = 13
                        wrist_lm = 15
                        hip_lm = 23
                        knee_lm = 25
                        ankle_lm = 27
                    
                    # Get back angle with the selected side
                    back_angle = pose.getAngle(img, shoulder_lm, hip_lm, ankle_lm)
                    
                    # Calculate elbow verticality (new feature)
                    # We'll use the angle between the elbow-shoulder line and a vertical line
                    shoulder = landmark_dict[shoulder_lm]
                    elbow = landmark_dict[elbow_lm]
                    
                    # Create a vertical line from elbow
                    vertical_point = (elbow[0], elbow[1] - 100)  # 100 pixels directly above elbow
                    
                    # Calculate the angle (shoulder-elbow-vertical)
                    dx1 = shoulder[0] - elbow[0]
                    dy1 = shoulder[1] - elbow[1]
                    
                    dx2 = vertical_point[0] - elbow[0]
                    dy2 = vertical_point[1] - elbow[1]
                    
                    dot_product = dx1 * dx2 + dy1 * dy2
                    mag1 = math.sqrt(dx1 * dx1 + dy1 * dy1)
                    mag2 = math.sqrt(dx2 * dx2 + dy2 * dy2)
                    
                    # Prevent division by zero
                    if mag1 * mag2 == 0:
                        elbow_vertical_angle = 0
                    else:
                        cos_angle = dot_product / (mag1 * mag2)
                        # Clamp cos_angle between -1 and 1 to avoid math domain error
                        cos_angle = max(-1, min(1, cos_angle))
                        elbow_vertical_angle = math.degrees(math.acos(cos_angle))
                    
                    # Determine if the elbow is leaning forward or backward
                    # If the shoulder is to the left of the elbow, adjust the angle
                    if (use_right_side and shoulder[0] < elbow[0]) or (not use_right_side and shoulder[0] > elbow[0]):
                        elbow_vertical_angle = 180 - elbow_vertical_angle
                    
                    # Calculate elbow swinging (horizontal movement)
                    # Get the current elbow position relative to shoulder
                    elbow_x_rel = elbow[0] - shoulder[0]
                    
                    # Track the relative horizontal movement of the elbow
                    elbow_x_movement = calculate_elbow_stability(elbow_x_rel)
                    
                    # Store current positions for next frame comparison
                    prev_positions["elbow_x"] = elbow_x_rel
                    prev_positions["elbow_y"] = elbow[1]
                    
                    # Store data for visualization
                    session_data["elbow_angles"].append(elbow_angle)
                    session_data["back_angles"].append(back_angle)
                    session_data["elbow_vertical_angles"].append(elbow_vertical_angle)
                    session_data["elbow_x_positions"].append(elbow_x_movement)
                    
                    # Extract points for the side we're analyzing
                    shoulder = landmark_dict[shoulder_lm]
                    elbow = landmark_dict[elbow_lm]
                    wrist = landmark_dict[wrist_lm]
                    hip = landmark_dict[hip_lm]
                    knee = landmark_dict[knee_lm]
                    ankle = landmark_dict[ankle_lm]
                    
                    # Highlight the arm and back we're analyzing with thicker lines
                    cv2.line(img, shoulder, elbow, (0, 255, 0), 4)  # Green line for arm
                    cv2.line(img, elbow, wrist, (0, 255, 0), 4)
                    cv2.line(img, shoulder, hip, (255, 200, 0), 3)  # Orange line for back
                    cv2.line(img, hip, knee, (255, 200, 0), 3)
                    cv2.line(img, knee, ankle, (255, 200, 0), 3)
                    
                    # Initialize feedback messages list
                    feedback_messages = []
                    
                    # Exercise state management
                    if exercise_state == "waiting":
                        # Check if user is in starting position (arms bent)
                        if elbow_angle < elbow_angle_up_threshold + 20:  # More lenient threshold for starting position
                            position_frames += 1
                            
                            # Add visual indicator that position is being detected
                            progress = min(1.0, position_frames / position_threshold)
                            bar_width = int(200 * progress)
                            cv2.rectangle(img, (img.shape[1]//2 - 100, 100), (img.shape[1]//2 + 100, 120), (100, 100, 100), -1)
                            cv2.rectangle(img, (img.shape[1]//2 - 100, 100), (img.shape[1]//2 - 100 + bar_width, 120), (0, 255, 0), -1)
                            
                            if position_frames >= position_threshold and not countdown_started:
                                # User has been in position for enough frames, start countdown
                                countdown_started = True
                                countdown_start_time = time.time()
                        else:
                            # Reset if user moves out of position
                            position_frames = max(0, position_frames - 2)  # Decrease more slowly to be forgiving
                            countdown_started = False
                        
                        # Handle countdown display
                        if countdown_started:
                            elapsed = time.time() - countdown_start_time
                            seconds_left = max(0, int(countdown_duration - elapsed))
                            
                            if seconds_left > 0:
                                # Show countdown in the middle of screen
                                text = str(seconds_left)
                                text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_DUPLEX, 5, 5)[0]
                                text_x = int((img.shape[1] - text_size[0]) / 2)
                                text_y = int((img.shape[0] + text_size[1]) / 2)
                                
                                # Draw large countdown number
                                cv2.putText(img, text, (text_x, text_y), 
                                          cv2.FONT_HERSHEY_DUPLEX, 5, (255, 255, 255), 5)
                                
                                # Add "Get Ready" text
                                ready_text = "Get Ready!"
                                ready_size = cv2.getTextSize(ready_text, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0]
                                ready_x = int((img.shape[1] - ready_size[0]) / 2)
                                cv2.putText(img, ready_text, (ready_x, text_y - 60), 
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                            else:
                                # Countdown finished, start counting reps
                                exercise_state = "counting"
                                print("Starting to count reps!")
                        else:
                            # Display "Get in position" message
                            feedback_messages.append(("Get in position (arms bent)", (0, 255, 255)))
                    
                    # Visual feedback with arrows
                    if exercise_state == "counting":
                        # ALWAYS check back angle and add arrow if needed when back is too straight
                        if back_angle > BACK_ANGLE_MAX:
                            # Back is too straight - draw arrow showing need to bend forward
                            midback = ((shoulder[0] + hip[0]) // 2, (shoulder[1] + hip[1]) // 2)
                            forward_point = (midback[0] + 50, midback[1] + 30)  # Point forward/down
                            img = draw_arrow(img, midback, forward_point, (0, 0, 255), 4)
                            feedback_messages.append(("Bend your back slightly forward", (0, 0, 255)))
                            form_issues["back_too_straight"] += 1
                        elif back_angle < BACK_ANGLE_MIN:
                            # Back is too tilted - draw arrow showing need to straighten up
                            midback = ((shoulder[0] + hip[0]) // 2, (shoulder[1] + hip[1]) // 2)
                            up_point = (midback[0], midback[1] - 50)  # Point up
                            img = draw_arrow(img, midback, up_point, (0, 0, 255), 4)
                            feedback_messages.append(("Straighten your back a bit", (0, 0, 255)))
                            form_issues["back_too_tilted"] += 1
                        
                        # Check elbow swinging (horizontal stability) - ONLY showing this alert now
                        if elbow_x_movement > ELBOW_STABILITY_THRESHOLD:
                            # Only show feedback for major swinging
                            if elbow_x_movement > BAD_ELBOW_STABILITY_THRESHOLD:
                                # Major swinging - red arrow
                                arrow_color = (0, 0, 255)  # Red
                                feedback_messages.append(("Stop swinging elbows!", (0, 0, 255)))
                                
                                # Draw stabilizing arrow showing elbows should be steady
                                side_point = (elbow[0] - 50, elbow[1])  # Point to side
                                img = draw_arrow(img, elbow, side_point, arrow_color, 4)
                                form_issues["elbow_swinging"] += 1
                            else:
                                # Minor swinging - track but don't show feedback
                                form_issues["elbow_swinging"] += 1
                    
                    # Only count reps if we're in counting state
                    if exercise_state == "counting":
                        current_time = time.time()
                        time_since_last_rep = current_time - last_rep_time
                        
                        # State machine for rep counting
                        if rep_state == "up" and elbow_angle > elbow_angle_down_threshold:
                            rep_state = "down"
                            print(f"State change: up -> down (angle: {elbow_angle:.1f})")
                            # Only count the rep once when transitioning from up to down
                            if not rep_counted and time_since_last_rep > min_time_between_reps:
                                rep_counted = True
                                counter += 1
                                last_rep_time = current_time
                                
                                # Print rep count
                                print(f"Rep {counter} detected!")
                                
                                # Store rep data
                                session_data["rep_markers"].append(frame_count)
                                session_data["rep_elbow_angles"].append(elbow_angle)
                                session_data["rep_back_angles"].append(back_angle)
                                session_data["rep_elbow_vertical_angles"].append(elbow_vertical_angle)
                                session_data["rep_elbow_stability"].append(elbow_x_movement)
                                
                                # Check for elbow swinging on this rep
                                if elbow_x_movement > ELBOW_STABILITY_THRESHOLD:
                                    form_issues["elbow_swinging"] += 1
                                
                        # Detect state change from arms extended back to arms bent
                        elif rep_state == "down" and elbow_angle < elbow_angle_up_threshold:
                            rep_state = "up"
                            rep_counted = False  # Reset the rep counted flag
                            print(f"State change: down -> up (angle: {elbow_angle:.1f})")
                    
                    # Visual indicator of current arm state
                    state_color = (0, 255, 0) if rep_state == "down" else (0, 165, 255)
                    
                    # Display rep counter in top-right corner with larger text
                    if exercise_state == "counting":
                        # Add a background box for the rep counter for better visibility
                        counter_text = f"Reps: {counter}"
                        (text_w, text_h), _ = cv2.getTextSize(counter_text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 2)
                        cv2.rectangle(img, (img.shape[1] - text_w - 180, 5), (img.shape[1] - 5, 45), (0, 0, 0), -1)
                        cv2.putText(img, counter_text, (img.shape[1] - text_w - 170, 35), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 2)
                    
                    # Draw all feedback messages at the bottom of the screen
                    if feedback_messages:
                        img = draw_bottom_feedback(img, feedback_messages)
                    
                except Exception as e:
                    print(f"Error processing frame: {e}")
                    # Just continue to the next frame
                    pass
        
        # Handle detection loss
        if not detection_found:
            detection_lost_frames += 1
            
            # Display a warning on screen
            if detection_lost_frames > 10:  # Show warning after 10 frames of lost detection
                warning_text = "Detection lost! Please adjust position."
                text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
                text_x = int((img.shape[1] - text_size[0]) / 2)
                text_y = int(img.shape[0] / 2)
                cv2.putText(img, warning_text, (text_x, text_y), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
            # Reset the trainer if detection is lost for too long
            if detection_lost_frames >= max_detection_lost_frames:
                print("Detection lost for too long, resetting trainer...")
                # Reset exercise tracking but not the CV system
                exercise_state = "waiting"
                rep_state = "up"
                position_frames = 0
                countdown_started = False
                rep_counted = False
                # Don't reset counter to preserve total count
                # Print message to console
                print("Trainer reset due to detection loss")
        
        # Show the image
        cv2.imshow("Webcam Tricep Pushdown Trainer", img)
        
        # Set window size to match image size to prevent stretching
        cv2.resizeWindow("Webcam Tricep Pushdown Trainer", img.shape[1], img.shape[0])
        
        # Exit on 'q' key press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    print("Trainer stopped by user")
except Exception as e:
    print(f"Error: {str(e)}")
finally:
    # Clean up
    print("Cleaning up...")
    cap.release()
    cv2.destroyAllWindows()
    
    # Create session visualization if we have data
    if len(session_data["frame_count"]) > 0:
        # Start graph creation in the background
        graph_thread = threading.Thread(target=create_graphs_in_background, args=(session_data,))
        graph_thread.daemon = True
        graph_thread.start()
        
        # Give the thread time to start processing
        time.sleep(0.5)
        print("Tricep pushdown trainer session ended")
    else:
        print("No data recorded during session") 