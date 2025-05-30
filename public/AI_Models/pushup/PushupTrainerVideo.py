import cv2
import numpy as np
import time
import PE_module as pm
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
import argparse
from datetime import datetime
import math
from collections import deque  # For rolling window calculation

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

def run_pushup_trainer(video_source=0, use_webcam=False):
    # Use webcam or video file based on arguments
    if use_webcam:
        cap = cv2.VideoCapture(video_source)  # 0 is usually the default webcam
        if not cap.isOpened():
            print(f"ERROR: Could not open webcam {video_source}")
            return
        print(f"Using webcam {video_source} for push-up training")
    else:
        cap = cv2.VideoCapture(video_source)  # video_source is a file path
        if not cap.isOpened():
            print(f"ERROR: Could not open video file {video_source}")
            return
    
    # Get video properties
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    if use_webcam:
        # For webcam, we don't have total frames
        total_frames = float('inf')  # Infinite frames for webcam
        print(f"Video properties: {frame_width}x{frame_height}, {fps} FPS")
    else:
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"Analyzing video: {video_source}")
        print(f"Video properties: {frame_width}x{frame_height}, {fps} FPS, {total_frames} frames")
    
    # Create output video file with original dimensions
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = f"pushup_training_{timestamp}.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    # If webcam FPS is 0, set a default
    if fps <= 0:
        fps = 30
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    
    # Initialize pose detection
    pose = pm.poseDetection(min_detection_confidence=0.75, min_tracking_confidence=0.75)
    counter = 0
    
    # Create a resizable window
    cv2.namedWindow("Push-up Trainer", cv2.WINDOW_NORMAL)
    
    # Set the maximum number of reps in a session
    MAX_REPS_PER_SESSION = 12
    session_completed_time = 0  # Time when session was completed
    session_complete = False
    
    # Push-up Form Variables
    improper_alignment_count = 0  # Sagging/raised hips
    improper_elbow_angle_count = 0  # Not achieving proper angle
    incomplete_rep_count = 0  # Not going deep enough
    
    current_rep_improper_alignment = False
    current_rep_improper_elbow_angle = False
    current_rep_incomplete = False
    
    # Push-up Form Variables
    body_alignment_score = 100  # Start with perfect score, deduct for issues
    elbow_angle_score = 100
    rep_depth_score = 100
    
    # Define angle thresholds for push-ups
    ELBOW_EXTENDED_ANGLE = 150  # Nearly straight arms at top position (was 160)
    ELBOW_BENT_ANGLE = 100  # Proper bottom position (was 90)
    ELBOW_TOO_BENT_ANGLE = 80  # Too low/deep (was 75)
    
    # Hip alignment thresholds (vertical distance from ideal line in pixels)
    HIP_SAG_THRESHOLD = 15  # Hips too low
    HIP_PIKE_THRESHOLD = 10  # Hips too high
    
    # T-shape elbow threshold
    ELBOW_WIDTH_THRESHOLD = 1.8  # Ratio of elbow width to shoulder width
    
    # Variables for form analysis
    min_elbow_angle_in_current_rep = 180
    max_elbow_angle_in_current_rep = 0
    form_feedback = ""
    is_incorrect = False  # Track if current rep is incorrect
    incorrect_reason = ""  # Reason why rep is incorrect
    
    # Improved rep counting
    rep_counted = False  # Flag to track if current push-up has been counted
    incorrect_rep_counted = False  # Separate flag for incorrect reps
    counter = 0  # Reset counter to zero
    incorrect_counter = 0  # Independent counter for incorrect reps
    
    # State tracking for more robust rep counting
    UP_POSITION = 0
    GOING_DOWN = 1
    DOWN_POSITION = 2
    GOING_UP = 3
    current_state = UP_POSITION
    
    # Angle thresholds for state transitions
    UP_THRESHOLD = 140  # Angle above which we consider the person in up position
    DOWN_THRESHOLD = 110  # Angle below which we consider the person in down position
    
    # Data collection for visualizations
    session_data = {
        "frame_count": [],
        "elbow_angles": [],
        "elbow_width_ratios": [], # T-shape detection
        "rep_markers": [],     # Frames where reps are completed
        "rep_depths": [],      # Depths of each completed rep (elbow angle)
        "rep_feedback": []     # Feedback for each rep
    }
    
    # Exercise state management (new)
    exercise_state = "waiting"  # "waiting" -> "ready" -> "counting"
    position_frames = 0  # Number of consecutive frames user has been in position
    position_threshold = 30  # Need this many frames in position to start counting
    countdown_started = False
    countdown_start_time = 0
    countdown_duration = 3  # seconds
    
    # Detection loss tracking (new)
    detection_lost_frames = 0
    max_detection_lost_frames = 30  # Reset trainer after this many frames with lost detection
    detection_found = False  # Flag to track if detection was found in the current frame
    
    # Add rolling window for body position tracking (new)
    body_positions_window = deque(maxlen=30)  # Track last 30 frames
    
    # Store previous positions for tracking movement (new)
    prev_positions = {
        "shoulder_x": None,
        "shoulder_y": None,
        "elbow_x": None,
        "elbow_y": None,
        "hip_x": None,
        "hip_y": None
    }
    
    # Calculate processing dimensions that maintain aspect ratio
    # Target width for processing (keep aspect ratio)
    target_width = 640
    target_height = int(target_width * frame_height / frame_width)
    
    frame_count = 0
    while True:
        success, img = cap.read()
        if not success:
            print("Video has ended")
            # Create visualization of the session data if we have data
            if len(session_data["elbow_angles"]) > 0:
                create_session_graphs(session_data, counter, incomplete_rep_count, improper_alignment_count, 
                                    ELBOW_BENT_ANGLE, ELBOW_TOO_BENT_ANGLE, HIP_SAG_THRESHOLD, HIP_PIKE_THRESHOLD,
                                    ELBOW_WIDTH_THRESHOLD)
            break
        
        frame_count += 1
        # Display progress
        if frame_count % 30 == 0:
            if use_webcam:
                print(f"Analyzing frame {frame_count} (Webcam input)")
            else:
                progress = frame_count / total_frames * 100
                print(f"Analyzing frame {frame_count}/{total_frames} ({progress:.1f}%)")
        
        # Keep original image for output
        original_img = img.copy()
        
        # Resize frame for processing while maintaining aspect ratio
        processing_img = cv2.resize(img, (target_width, target_height))
        
        # Reset detection found flag for this frame
        detection_found = False
        
        # Find pose on the resized image - set draw=True to show landmarks
        processing_img = pose.findPose(processing_img, draw=True)
        lmList = pose.getPosition(processing_img, draw=True)
        
        # Process pose if landmarks are found
        if len(lmList) > 15:  # Need at least shoulders, elbows, wrists
            # Mark detection as found for this frame
            detection_found = True
            detection_lost_frames = 0  # Reset lost frame counter
            
            # Transfer landmarks to original image with proper scaling
            # Calculate scaling factors
            scale_x = frame_width / target_width
            scale_y = frame_height / target_height
            
            # Draw skeleton on original image with proper scaling
            if len(lmList) >= 33:
                # Define connections (pairs of landmarks that should be connected)
                # Only include arms and shoulders connections
                connections = [
                    # Arms
                    (11, 13), (13, 15),  # Left arm
                    (12, 14), (14, 16),  # Right arm
                    # Shoulders
                    (11, 12)
                ]
                
                # Draw connections
                for pair in connections:
                    if pair[0] < len(lmList) and pair[1] < len(lmList):
                        pt1 = (int(lmList[pair[0]][1] * scale_x), int(lmList[pair[0]][2] * scale_y))
                        pt2 = (int(lmList[pair[1]][1] * scale_x), int(lmList[pair[1]][2] * scale_y))
                        cv2.line(original_img, pt1, pt2, (0, 255, 0), max(1, int(frame_width / 640 * 2)))
                
                # Draw landmark points - only for upper body (shoulders and arms)
                upper_body_landmarks = [11, 12, 13, 14, 15, 16]  # Shoulders and arms only
                for idx in upper_body_landmarks:
                    if idx < len(lmList):
                        x, y = int(lmList[idx][1] * scale_x), int(lmList[idx][2] * scale_y)
                        cv2.circle(original_img, (x, y), max(5, int(frame_width / 640 * 8)), (255, 0, 0), -1)
                        cv2.circle(original_img, (x, y), max(3, int(frame_width / 640 * 4)), (0, 255, 255), -1)
            
            # Right arm (IDs: 12=shoulder, 14=elbow, 16=wrist)
            right_elbow_angle = pose.getAngle(processing_img, 12, 14, 16)
            
            # Check for T-shape elbow positioning (forearms not straight)
            if len(lmList) >= 17:  # Need both arms
                right_shoulder_x, right_shoulder_y = lmList[12][1:]
                right_elbow_x, right_elbow_y = lmList[14][1:]
                right_wrist_x, right_wrist_y = lmList[16][1:]
                
                left_shoulder_x, left_shoulder_y = lmList[11][1:]
                left_elbow_x, left_elbow_y = lmList[13][1:]
                left_wrist_x, left_wrist_y = lmList[15][1:]
                
                # Scale coordinates for the original image
                right_shoulder = (int(right_shoulder_x * scale_x), int(right_shoulder_y * scale_y))
                right_elbow = (int(right_elbow_x * scale_x), int(right_elbow_y * scale_y))
                right_wrist = (int(right_wrist_x * scale_x), int(right_wrist_y * scale_y))
                
                left_shoulder = (int(left_shoulder_x * scale_x), int(left_shoulder_y * scale_y))
                left_elbow = (int(left_elbow_x * scale_x), int(left_elbow_y * scale_y))
                left_wrist = (int(left_wrist_x * scale_x), int(left_wrist_y * scale_y))
                
                # Calculate elbow width ratio (key T-shape indicator)
                shoulder_width = abs(right_shoulder_x - left_shoulder_x)
                elbow_width = abs(right_elbow_x - left_elbow_x)
                
                if shoulder_width > 0:
                    elbow_width_ratio = elbow_width / shoulder_width
                else:
                    elbow_width_ratio = 1.0
                    
                # Store elbow width ratio data
                session_data["elbow_width_ratios"].append(elbow_width_ratio)
                
                # Initialize feedback messages list
                feedback_messages = []
                
                # Add overlay for elbow width ratio (T-shape detection)
                t_shape_text = ""
                if elbow_width_ratio > ELBOW_WIDTH_THRESHOLD:  # Threshold for T-shape (elbows too wide)
                    t_shape_text = "T-SHAPE ELBOWS (Fix: Keep elbows in)"
                    is_incorrect = True
                    incorrect_reason = "Elbows out (T-shape)"
                    current_rep_improper_elbow_angle = True
                    
                    # Add visual feedback with arrows for T-shape correction
                    mid_x = (right_elbow[0] + left_elbow[0]) // 2
                    mid_y = (right_elbow[1] + left_elbow[1]) // 2
                    
                    # No longer drawing arrows for elbows as requested
                    
                    # Add feedback message
                    feedback_messages.append(("Keep elbows in! Avoid T-shape", (0, 0, 255)))
            
            # Hip alignment detection removed as requested
            
            # Exercise state management
            if exercise_state == "waiting":
                # Check if user is in starting position (arms extended - top of pushup)
                if right_elbow_angle > UP_THRESHOLD:
                    position_frames += 1
                    
                    # Add visual indicator that position is being detected
                    progress = min(1.0, position_frames / position_threshold)
                    bar_width = int(200 * progress)
                    cv2.rectangle(original_img, (original_img.shape[1]//2 - 100, 100), 
                                 (original_img.shape[1]//2 + 100, 120), (100, 100, 100), -1)
                    cv2.rectangle(original_img, (original_img.shape[1]//2 - 100, 100), 
                                 (original_img.shape[1]//2 - 100 + bar_width, 120), (0, 255, 0), -1)
                    
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
                        text_x = int((original_img.shape[1] - text_size[0]) / 2)
                        text_y = int((original_img.shape[0] + text_size[1]) / 2)
                        
                        # Draw large countdown number
                        cv2.putText(original_img, text, (text_x, text_y), 
                                  cv2.FONT_HERSHEY_DUPLEX, 5, (255, 255, 255), 5)
                        
                        # Add "Get Ready" text
                        ready_text = "Get Ready!"
                        ready_size = cv2.getTextSize(ready_text, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0]
                        ready_x = int((original_img.shape[1] - ready_size[0]) / 2)
                        cv2.putText(original_img, ready_text, (ready_x, text_y - 60), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    else:
                        # Countdown finished, start counting reps
                        exercise_state = "counting"
                        print("Starting to count reps!")
                else:
                    # Display "Get in position" message
                    if not feedback_messages:  # Only if no other messages
                        feedback_messages.append(("Get in top pushup position (arms extended)", (0, 255, 255)))
            
            # Rep counting logic - Only process if in counting state
            if exercise_state == "counting":
                # Store the minimum and maximum elbow angles in the current repetition
                if right_elbow_angle < min_elbow_angle_in_current_rep:
                    min_elbow_angle_in_current_rep = right_elbow_angle
                if right_elbow_angle > max_elbow_angle_in_current_rep:
                    max_elbow_angle_in_current_rep = right_elbow_angle
                
                # State transition logic
                if current_state == UP_POSITION and right_elbow_angle < UP_THRESHOLD:
                    current_state = GOING_DOWN
                elif current_state == GOING_DOWN and right_elbow_angle < DOWN_THRESHOLD:
                    current_state = DOWN_POSITION
                elif current_state == DOWN_POSITION and right_elbow_angle > DOWN_THRESHOLD:
                    current_state = GOING_UP
                elif current_state == GOING_UP and right_elbow_angle > UP_THRESHOLD:
                    # Count the rep when we return to the up position
                    # Make sure it was a complete rep with sufficient range of motion
                    if max_elbow_angle_in_current_rep - min_elbow_angle_in_current_rep > 30:
                        counter += 1
                        # Store the depth of this rep
                        session_data["rep_depths"].append(min_elbow_angle_in_current_rep)
                        session_data["rep_markers"].append(frame_count)
                        
                        # Determine feedback for this rep
                        if current_rep_improper_alignment:
                            form_feedback = "Poor body alignment"
                            improper_alignment_count += 1
                        elif current_rep_improper_elbow_angle:
                            form_feedback = "Elbows out (T-shape)"
                            improper_elbow_angle_count += 1
                        else:
                            form_feedback = "Good form"
                        
                        # Store feedback for this rep
                        session_data["rep_feedback"].append(form_feedback)
                        
                        # Check if we've reached the max reps for the session
                        if counter >= MAX_REPS_PER_SESSION and not session_complete:
                            session_complete = True
                            session_completed_time = time.time()
                            print(f"Session completed! {MAX_REPS_PER_SESSION} reps finished.")
                    
                    # Reset for next rep
                    current_state = UP_POSITION
                    min_elbow_angle_in_current_rep = 180
                    max_elbow_angle_in_current_rep = 0
                    current_rep_improper_alignment = False
                    current_rep_improper_elbow_angle = False
                    current_rep_incomplete = False
            
            # Add current elbow angle to session data
            session_data["elbow_angles"].append(right_elbow_angle)
            session_data["frame_count"].append(frame_count)
            
            # Add feedback to the original image
            # Scale the font and positions based on original image size
            font_scale = frame_width / 640 * 0.5
            thickness = max(1, int(frame_width / 640 * 2))
            y_offset = int(frame_height / 20)
            
            # No longer displaying the elbow angle as requested
            
            # Display rep counter with color coding (keep only total reps)
            if exercise_state == "counting":
                # Add a background box for the rep counter for better visibility
                counter_text = f"Reps: {counter}"
                (text_w, text_h), _ = cv2.getTextSize(counter_text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 2)
                cv2.rectangle(original_img, (original_img.shape[1] - text_w - 30, 5), 
                             (original_img.shape[1] - 5, 45), (0, 0, 0), -1)
                cv2.putText(original_img, counter_text, (original_img.shape[1] - text_w - 20, 35), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 2)
            else:
                cv2.putText(original_img, f"Reps: {counter}", 
                           (10, 2*y_offset), cv2.FONT_HERSHEY_SIMPLEX, 
                           font_scale, (0, 255, 0), thickness)
            
            # Display T-shape warning only if detected
            if 'elbow_width_ratio' in locals() and elbow_width_ratio > ELBOW_WIDTH_THRESHOLD:
                cv2.putText(original_img, "T-SHAPE ELBOWS (Fix: Keep elbows in)", 
                           (10, 3*y_offset), cv2.FONT_HERSHEY_SIMPLEX, 
                           font_scale, (0, 0, 255), thickness)
            
            # Only show T-shape alert when detected, not the elbow width ratio meter
            if 'elbow_width_ratio' in locals() and elbow_width_ratio > ELBOW_WIDTH_THRESHOLD:
                # Show a clear T-shape alert in a prominent position
                alert_text = "T-SHAPE ELBOWS! KEEP ELBOWS IN"
                text_size = cv2.getTextSize(alert_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                alert_x = int((original_img.shape[1] - text_size[0]) / 2)  # Center horizontally
                cv2.putText(original_img, alert_text, 
                          (alert_x, 80), cv2.FONT_HERSHEY_SIMPLEX, 
                          0.9, (0, 0, 255), 2)
            
            # Draw all feedback messages at the bottom of the screen
            if 'feedback_messages' in locals() and feedback_messages:
                original_img = draw_bottom_feedback(original_img, feedback_messages)
                
        # Handle detection loss
        if not detection_found:
            detection_lost_frames += 1
            
            # Display a warning on screen
            if detection_lost_frames > 10:  # Show warning after 10 frames of lost detection
                warning_text = "Detection lost! Please adjust position."
                text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
                text_x = int((original_img.shape[1] - text_size[0]) / 2)
                text_y = int(original_img.shape[0] / 2)
                cv2.putText(original_img, warning_text, (text_x, text_y), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
            # Reset the trainer if detection is lost for too long
            if detection_lost_frames >= max_detection_lost_frames:
                print("Detection lost for too long, resetting trainer...")
                # Reset exercise tracking but not the CV system
                exercise_state = "waiting"
                current_state = UP_POSITION
                position_frames = 0
                countdown_started = False
                # Don't reset counter to preserve total count
                # Print message to console
                print("Trainer reset due to detection loss")
        
        # Check if session is complete to show rest message
        if session_complete:
            # Create a semi-transparent overlay for better text visibility
            overlay = original_img.copy()
            cv2.rectangle(overlay, (0, 0), (original_img.shape[1], original_img.shape[0]), (0, 0, 0), -1)
            original_img = cv2.addWeighted(overlay, 0.3, original_img, 0.7, 0)
            
            # Display large "Now take rest" message
            rest_text = "NOW TAKE REST"
            text_size = cv2.getTextSize(rest_text, cv2.FONT_HERSHEY_DUPLEX, 1.5, 2)[0]
            text_x = int((original_img.shape[1] - text_size[0]) / 2)
            text_y = int((original_img.shape[0] + text_size[1]) / 2)
            cv2.putText(original_img, rest_text, (text_x, text_y), 
                        cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 2)
            
            # Display session summary
            summary_text = f"Session complete: {counter} reps"
            summary_size = cv2.getTextSize(summary_text, cv2.FONT_HERSHEY_SIMPLEX, 1, 2)[0]
            summary_x = int((original_img.shape[1] - summary_size[0]) / 2)
            cv2.putText(original_img, summary_text, (summary_x, text_y + 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Exit after showing the message for 5 seconds
            if time.time() - session_completed_time > 5:
                print(f"Session completed! Creating visualization for {counter} reps.")
                break
        
        # Write original image with overlaid feedback to output video (no distortion)
        out.write(original_img)
        
        # Display the image (resized for display only)
        display_img = cv2.resize(original_img, (min(frame_width, 1280), min(frame_height, 720)))
        cv2.imshow("Push-up Trainer", display_img)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Clean up
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    
    print(f"\nAnalysis complete!")
    print(f"Total reps: {counter}")
    print(f"Incomplete reps: {incomplete_rep_count}")
    print(f"Reps with alignment issues: {improper_alignment_count}")
    print(f"Reps with elbow position issues: {improper_elbow_angle_count}")
    print(f"Output video saved to: {output_path}")


def create_session_graphs(session_data, counter, incomplete_rep_count, improper_alignment_count,
                         ELBOW_BENT_ANGLE, ELBOW_TOO_BENT_ANGLE, HIP_SAG_THRESHOLD, HIP_PIKE_THRESHOLD,
                         ELBOW_WIDTH_THRESHOLD):
    """Create interactive graphs of the training session using Plotly"""
    # Create a subplot with 3 rows
    fig = make_subplots(
        rows=3, cols=1,
        subplot_titles=("Push-up Depth (Elbow Angle)", "Body Alignment", "Elbow Width Ratio (T-shape)"),
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
    
    # Add horizontal lines for elbow angle thresholds
    fig.add_trace(
        go.Scatter(
            x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
            y=[ELBOW_BENT_ANGLE, ELBOW_BENT_ANGLE],
            mode="lines",
            name="Target Depth",
            line=dict(color="green", width=1, dash="dash")
        ),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Scatter(
            x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
            y=[ELBOW_TOO_BENT_ANGLE, ELBOW_TOO_BENT_ANGLE],
            mode="lines",
            name="Too Deep",
            line=dict(color="red", width=1, dash="dash")
        ),
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
    
    # Add trace for body alignment (higher values = worse alignment)
    if session_data["body_alignment"]:
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"], 
                y=session_data["body_alignment"],
                mode="lines",
                name="Body Alignment",
                line=dict(color="orange", width=2)
            ),
            row=2, col=1
        )
        
        # Add horizontal line for alignment thresholds
        fig.add_trace(
            go.Scatter(
                x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
                y=[HIP_SAG_THRESHOLD, HIP_SAG_THRESHOLD],
                mode="lines",
                name="Hip Sag Threshold",
                line=dict(color="red", width=1, dash="dash")
            ),
            row=2, col=1
        )
    
    # Add trace for elbow width ratio (T-shape indicator)
    if session_data["elbow_width_ratios"]:
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"],
                y=session_data["elbow_width_ratios"],
                mode="lines",
                name="Elbow Width Ratio",
                line=dict(color="purple", width=2)
            ),
            row=3, col=1
        )
        
        # Add horizontal line for T-shape threshold
        fig.add_trace(
            go.Scatter(
                x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
                y=[ELBOW_WIDTH_THRESHOLD, ELBOW_WIDTH_THRESHOLD],
                mode="lines",
                name="T-shape Threshold",
                line=dict(color="red", width=1, dash="dash")
            ),
            row=3, col=1
        )
    
    # Add rep markers to all charts
    for frame in session_data["rep_markers"]:
        for row in range(2, 4):  # Add to rows 2 and 3
            fig.add_vline(
                x=frame, line_width=1, line_dash="solid", line_color="gray",
                row=row, col=1
            )
    
    # Create table of rep data
    if session_data["rep_depths"]:
        rep_table = go.Figure(data=[
            go.Table(
                header=dict(
                    values=["Rep #", "Depth (Angle)", "Body Alignment", "Feedback"],
                    fill_color="paleturquoise",
                    align="left"
                ),
                cells=dict(
                    values=[
                        list(range(1, len(session_data["rep_depths"])+1)),
                        [f"{angle:.1f}°" for angle in session_data["rep_depths"]],
                        ["Good" if alignment < HIP_SAG_THRESHOLD and alignment > -HIP_PIKE_THRESHOLD else "Poor" 
                         for alignment in session_data["body_alignment"][:len(session_data["rep_depths"])]],
                        session_data["rep_feedback"]
                    ],
                    fill_color="lavender",
                    align="left"
                )
            )
        ])
        
        rep_table.update_layout(
            title="Push-up Rep Details",
            height=500,
            width=800
        )
    
    # Update layout with title and height
    fig.update_layout(
        title_text="Push-up Training Session Analysis",
        height=1000,
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
    fig.update_yaxes(title_text="Hip Alignment (pixels)", row=2, col=1)
    fig.update_yaxes(title_text="Elbow Width Ratio", row=3, col=1)
    
    # Update x-axis labels
    fig.update_xaxes(title_text="Frame Number", row=3, col=1)
    
    # Add annotations for statistics
    fig.add_annotation(
        xref="paper", yref="paper",
        x=0.5, y=1.05,
        text=f"Total Reps: {int(counter)}, Incomplete: {incomplete_rep_count}, Alignment Issues: {improper_alignment_count}",
        showarrow=False,
        font=dict(size=14)
    )
    
    # Create timestamp for file names
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create a directory for results if it doesn't exist
    os.makedirs("session_results", exist_ok=True)
    
    # Save graphs as HTML files
    fig.write_html(f"session_results/pushup_analysis_{timestamp}.html")
    if session_data["rep_depths"]:
        rep_table.write_html(f"session_results/pushup_details_{timestamp}.html")
    
    print(f"\nSession analysis saved to 'session_results/pushup_analysis_{timestamp}.html'")
    if session_data["rep_depths"]:
        print(f"Rep details saved to 'session_results/pushup_details_{timestamp}.html'")


def main():
    # Hard coded to use webcam
    camera_id = 0  # Use default camera (usually 0)
    
    # Use webcam mode
    print("\n=== STARTING PUSH-UP TRAINER WITH WEBCAM ===")
    print("Press 'q' to quit")
    run_pushup_trainer(video_source=camera_id, use_webcam=True)
    
    # Note: The code below is commented out since we're only using webcam mode now
    '''
    # Use the pre-recorded videos
    # Good form - inwards elbows (correct)
    good_pushup_video = 'C:/Users/mmewi/Downloads/Grad project/مجلد جديد/GOOD PUSHUP - Correct inwards elbows.mp4'
    
    # Bad form - outwards elbows (incorrect T-shape)
    bad_pushup_video = 'C:/Users/mmewi/Downloads/Grad project/مجلد جديد/Bad PUSHUP - incorrect outwards elbows.mp4'
    
    # Analyze both videos in sequence
    print("\n=== ANALYZING GOOD FORM PUSHUP VIDEO ===")
    run_pushup_trainer(video_source=good_pushup_video, use_webcam=False)
    
    print("\n=== ANALYZING BAD FORM PUSHUP VIDEO (T-SHAPE ELBOWS) ===")
    run_pushup_trainer(video_source=bad_pushup_video, use_webcam=False)
    '''


if __name__ == "__main__":
    main()