import cv2
import numpy as np
import time
import PE_module as pm
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
from datetime import datetime

# Use webcam instead of video file
print("Starting Webcam Squat Trainer...")
print("Press 'q' to exit")
cap = cv2.VideoCapture(0)  # Use webcam (0 is usually the built-in webcam)

# Check if webcam opened successfully
if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

pose = pm.poseDetection(min_detection_confidence=0.75, min_tracking_confidence=0.75)  # Increased confidence thresholds
counter = 0
direction = 0

# Define the desired dimensions for resizing
width = 640
height = 480

# Create a resizable window
cv2.namedWindow("Webcam Squat Trainer", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Webcam Squat Trainer", width, height)

# For squats, we need different angle points and thresholds
# Hip-Knee-Ankle angle for squat tracking
# 23, 25, 27 = Left hip, knee, ankle from MediaPipe
# 24, 26, 28 = Right hip, knee, ankle from MediaPipe

# Keep track of squat quality
too_deep_count = 0
not_deep_enough_count = 0
knee_caving_count = 0
current_rep_too_deep = False
current_rep_not_deep_enough = False
current_rep_knees_caved = False

# Define angle thresholds - CALIBRATED FROM REFERENCE VIDEOS
STANDING_ANGLE = 170.0      # Standing straight (lowered slightly to be more forgiving)

# Updated thresholds - RANGES instead of single values
# Good squat depth range (expanded for a larger green zone)
GOOD_SQUAT_LOWER_ANGLE = 45.0  # Lower bound (deeper) - lowered from 50.0
GOOD_SQUAT_UPPER_ANGLE = 95.0  # Upper bound (less deep) - raised from 80.0

# Minimum required depth range (adjusted to match the expanded good range)
MIN_REQUIRED_LOWER_ANGLE = 95.0  # Lower bound (deeper) - adjusted to match GOOD_SQUAT_UPPER_ANGLE
MIN_REQUIRED_UPPER_ANGLE = 140.0  # Upper bound (less deep)

# Too deep threshold
TOO_DEEP_ANGLE = 35.0       # Too deep squat threshold (lowered from 42.0 to allow deeper squats)

# Define knee alignment thresholds - CALIBRATED FROM REFERENCE VIDEOS
KNEE_CAVING_THRESHOLD = 1.1  # Increased from 0.9 to make detection more sensitive
CORRECT_MIN_RATIO = 0.85      # Increased from 0.80 for better alignment detection
CORRECT_MAX_RATIO = 1.61      # Maximum normal knee/ankle ratio

# Knee caving detection variables
knee_ratio_history = []  # Track recent knee ratios
KNEE_HISTORY_LENGTH = 10  # Number of frames to track for smoothing
knee_caving_consecutive_frames = 0  # Count consecutive frames with caved knees
KNEE_CAVING_FRAME_THRESHOLD = 3  # Reduced from 5 to detect knee caving faster

# Variables for form analysis
min_angle_in_current_rep = 180
min_knee_ratio_in_current_rep = 2.0  # Start with high value, will track minimum
form_feedback = ""
is_incorrect = False  # Track if current rep is incorrect
incorrect_reason = ""  # Reason why rep is incorrect

# Simplified rep counting
rep_counted = False  # Flag to track if current deep position has been counted
incorrect_rep_counted = False  # Separate flag for incorrect reps
counter = 0  # Reset counter to zero
incorrect_counter = 0  # Independent counter for incorrect reps

# Set the maximum number of reps in a session
MAX_REPS_PER_SESSION = 12
session_completed_time = 0  # Time when session was completed
session_complete = False  # Flag to track if session is complete

# Data collection for visualizations
session_data = {
    "frame_count": [],
    "knee_angles": [],
    "knee_ratios": [],
    "rep_markers": [],
    "rep_knee_angles": [],
    "rep_feedback": []
}

def create_session_graphs(session_data):
    """Create interactive graphs of the training session using Plotly"""
    # Create a subplot with 2 rows
    fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=("Squat Depth (Knee Angle)", "Knee Alignment (Knee/Ankle Ratio)"),
        vertical_spacing=0.12
    )
    
    # Add traces for knee angles
    fig.add_trace(
        go.Scatter(
            x=session_data["frame_count"], 
            y=session_data["knee_angles"],
            mode="lines",
            name="Knee Angle",
            line=dict(color="royalblue", width=2)
        ),
        row=1, col=1
    )
    
    # Add horizontal lines for squat depth thresholds
    # Too deep threshold
    fig.add_trace(
        go.Scatter(
            x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
            y=[TOO_DEEP_ANGLE, TOO_DEEP_ANGLE],
            mode="lines",
            name="Too Deep",
            line=dict(color="red", width=1, dash="dash")
        ),
        row=1, col=1
    )
    
    # Good squat depth range
    fig.add_trace(
        go.Scatter(
            x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
            y=[GOOD_SQUAT_LOWER_ANGLE, GOOD_SQUAT_LOWER_ANGLE],
            mode="lines",
            name="Good Depth Lower",
            line=dict(color="green", width=1, dash="dash")
        ),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Scatter(
            x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
            y=[GOOD_SQUAT_UPPER_ANGLE, GOOD_SQUAT_UPPER_ANGLE],
            mode="lines",
            name="Good Depth Upper",
            line=dict(color="green", width=1, dash="dash")
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
            x=frame, y=max(session_data["knee_angles"]),
            text=f"Rep {idx+1}",
            showarrow=False,
            yshift=10,
            row=1, col=1
        )
    
    # Add trace for knee ratios
    if "knee_ratios" in session_data and len(session_data["knee_ratios"]) > 0:
        fig.add_trace(
            go.Scatter(
                x=session_data["frame_count"][:len(session_data["knee_ratios"])], 
                y=session_data["knee_ratios"],
                mode="lines",
                name="Knee/Ankle Ratio",
                line=dict(color="orange", width=2)
            ),
            row=2, col=1
        )
        
        # Add horizontal line for knee caving threshold
        fig.add_trace(
            go.Scatter(
                x=[min(session_data["frame_count"]), max(session_data["frame_count"])],
                y=[KNEE_CAVING_THRESHOLD, KNEE_CAVING_THRESHOLD],
                mode="lines",
                name="Knee Caving Threshold",
                line=dict(color="red", width=1, dash="dash")
            ),
            row=2, col=1
        )
        
        # Add rep markers to knee ratio chart
        for frame in session_data["rep_markers"]:
            fig.add_vline(
                x=frame, line_width=1, line_dash="solid", line_color="gray",
                row=2, col=1
            )
    
    # Create table of rep data
    rep_table = go.Figure(data=[
        go.Table(
            header=dict(
                values=["Rep #", "Depth (Angle)", "Feedback"],
                fill_color="paleturquoise",
                align="left"
            ),
            cells=dict(
                values=[
                    list(range(1, len(session_data["rep_knee_angles"])+1)),
                    [f"{angle:.1f}°" for angle in session_data["rep_knee_angles"]],
                    session_data["rep_feedback"]
                ],
                fill_color="lavender",
                align="left"
            )
        )
    ])
    
    rep_table.update_layout(
        title="Squat Rep Details",
        height=500,
        width=800
    )
    
    # Update layout with title and height
    fig.update_layout(
        title_text="Squat Training Session Analysis",
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
    fig.update_yaxes(title_text="Knee Angle (degrees)", row=1, col=1)
    fig.update_yaxes(title_text="Knee/Ankle Ratio", row=2, col=1)
    
    # Update x-axis labels
    fig.update_xaxes(title_text="Frame Number", row=2, col=1)
    
    # Add annotations for statistics
    fig.add_annotation(
        xref="paper", yref="paper",
        x=0.5, y=1.05,
        text=f"Total Reps: {int(counter)}, Too Deep: {too_deep_count}, Not Deep Enough: {not_deep_enough_count}, Knee Caving: {knee_caving_count}",
        showarrow=False,
        font=dict(size=12)
    )
    
    # Create timestamp for file names
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create a directory for results if it doesn't exist
    os.makedirs("session_results", exist_ok=True)
    
    # Save graphs as HTML files
    fig.write_html(f"session_results/squat_analysis_{timestamp}.html")
    rep_table.write_html(f"session_results/squat_details_{timestamp}.html")
    
    print(f"\nSession analysis saved to 'session_results/squat_analysis_{timestamp}.html'")
    print(f"Rep details saved to 'session_results/squat_details_{timestamp}.html'")
    
    return True

def resize_with_aspect_ratio(image, target_width=None, target_height=None):
    """Resize an image while maintaining aspect ratio"""
    # Get original dimensions
    original_height, original_width, _ = image.shape
    
    # Scale by width
    if target_width is not None:
        scale_factor = target_width / original_width
        new_width = target_width
        new_height = int(original_height * scale_factor)
    
    # Scale by height    
    elif target_height is not None:
        scale_factor = target_height / original_height
        new_height = target_height
        new_width = int(original_width * scale_factor)
        
    # Resize the image
    return cv2.resize(image, (new_width, new_height))

# Main loop for webcam processing
try:
    while True:
        success, img = cap.read()
        if not success:
            print("Failed to read from webcam.")
            break
            
        # Flip horizontally for a mirror effect
        img = cv2.flip(img, 1)
        
        # Resize image while maintaining aspect ratio
        img = resize_with_aspect_ratio(img, target_width=width)
        
        # Process pose detection
        img = pose.findPose(img, True)  # Set to True to visualize pose landmarks
        lmList = pose.getPosition(img, False)
        
        if len(lmList) != 0:
            # For squats, track hip-knee-ankle angle
            # We'll use the right leg
            angle = pose.getAngle(img, 24, 26, 28, draw=True)  # Right hip, knee, ankle
            
            # Make sure angle is valid before proceeding
            if not np.isnan(angle) and angle > 0:
                # Track minimum angle in current rep
                if angle < min_angle_in_current_rep:  # Going down
                    min_angle_in_current_rep = angle
                
                # Map angle to percentage where 0% is standing and 100% is deepest squat
                # In this scale, a "perfect" squat would be around 70-80%
                per = np.interp(angle, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0))
                
                # Calculate knee alignment ratio
                if len(lmList) >= 33:  # Make sure we have all landmarks
                    # Get coordinates for left side
                    left_hip_x, left_hip_y = lmList[23][1:]
                    left_knee_x, left_knee_y = lmList[25][1:]
                    left_ankle_x, left_ankle_y = lmList[27][1:]
                    
                    # Get coordinates for right side
                    right_hip_x, right_hip_y = lmList[24][1:]
                    right_knee_x, right_knee_y = lmList[26][1:]
                    right_ankle_x, right_ankle_y = lmList[28][1:]
                    
                    # Calculate knee width (distance between knees)
                    knee_width = abs(right_knee_x - left_knee_x)
                    
                    # Calculate ankle width (distance between ankles)
                    ankle_width = abs(right_ankle_x - left_ankle_x)
                    
                    # Calculate knee-to-ankle width ratio (main metric for knee caving)
                    # When knees cave in, this ratio will be smaller
                    knee_ankle_ratio = knee_width / ankle_width if ankle_width > 0 else 0
                    
                    # Ensure knee_ankle_ratio is valid before processing it
                    if knee_ankle_ratio > 0:
                        # Add to rolling history for smoothing
                        knee_ratio_history.append(knee_ankle_ratio)
                        if len(knee_ratio_history) > KNEE_HISTORY_LENGTH:
                            knee_ratio_history.pop(0)  # Remove oldest entry
                        
                        # Calculate smoothed ratio
                        smoothed_knee_ratio = sum(knee_ratio_history) / len(knee_ratio_history)
                        
                        # Track minimum knee ratio in current rep
                        if smoothed_knee_ratio < min_knee_ratio_in_current_rep:
                            min_knee_ratio_in_current_rep = smoothed_knee_ratio
                        
                        # Simplified knee caving detection - only when in squat position
                        if per > 30:  # Only check when in a meaningful squat depth
                            # Simple binary decision: below threshold = bad (red), above = good (green)
                            if smoothed_knee_ratio < KNEE_CAVING_THRESHOLD:
                                knee_line_color = (0, 0, 255)  # Red - knees should be outwards
                                knee_caving_consecutive_frames += 1
                                knee_status = "BAD"
                            else:
                                knee_line_color = (0, 255, 0)  # Green - good knee position
                                knee_caving_consecutive_frames = max(0, knee_caving_consecutive_frames - 1)
                                knee_status = "GOOD"
                            
                            # Only mark as knee caving if we detect multiple consecutive frames
                            if knee_caving_consecutive_frames >= KNEE_CAVING_FRAME_THRESHOLD:
                                current_rep_knees_caved = True
                            
                            # Always draw the knee connection line with appropriate color
                            knee_line_thickness = 2
                            if current_rep_knees_caved and knee_caving_consecutive_frames >= KNEE_CAVING_FRAME_THRESHOLD:
                                knee_line_thickness = 3  # Thicker line when definitely caving in
                            
                            # Draw knee connection line
                            cv2.line(img, (left_knee_x, left_knee_y), (right_knee_x, right_knee_y), knee_line_color, knee_line_thickness)
                            
                            # Draw ideal knee position as a reference (only when knees are caving)
                            if smoothed_knee_ratio < KNEE_CAVING_THRESHOLD:
                                # Calculate ideal knee position based on ankle width
                                ideal_knee_distance = ankle_width * CORRECT_MIN_RATIO * 1.3  # Wider reference line
                                left_ideal_x = int(right_knee_x - ideal_knee_distance)
                                
                                # Draw ideal line in green - use cv2.LINE_AA for anti-aliasing
                                cv2.line(img, (left_ideal_x, left_knee_y), (right_knee_x, right_knee_y), (0, 255, 0), 1)
                                
                                # Add outward arrows to show correction direction
                                if current_rep_knees_caved:
                                    mid_y = (left_knee_y + right_knee_y) // 2
                                    cv2.arrowedLine(img, (left_knee_x + 10, mid_y), (left_knee_x - 20, mid_y), 
                                                knee_line_color, 2, tipLength=0.5)
                                    cv2.arrowedLine(img, (right_knee_x - 10, mid_y), (right_knee_x + 20, mid_y), 
                                                knee_line_color, 2, tipLength=0.5)
                                    
                                    # Add more prominent knee caving warning text
                                    warning_text = "KNEES CAVING IN!"
                                    text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)[0]
                                    text_x = width // 2 - text_size[0] // 2  # Center text
                                    cv2.putText(img, warning_text, (text_x, 80), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                                    
                                    # Add corrective instruction at bottom 
                                    instruction = "Push knees outward!"
                                    cv2.putText(img, instruction, (width // 2 - 100, height - 30), 
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                        else:
                            # Reset consecutive frame counter if not in squat position
                            knee_caving_consecutive_frames = 0
                        
                        # Record knee ratio data for visualization
                        session_data["knee_ratios"].append(smoothed_knee_ratio)
                
                # Visualize percentage with colored bar
                bar_height = 300
                bar_x = 580
                bar_width = 50  # Increased from 40
                filled_height = int(per * bar_height / 100)
                
                # Draw the full bar outline
                cv2.rectangle(img, (bar_x, 300), (bar_x + bar_width, 300 - bar_height), (255, 255, 255), 3)
                
                # Draw the "too deep" threshold line
                too_deep_y = 300 - int(np.interp(TOO_DEEP_ANGLE, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0)) * bar_height / 100)
                cv2.line(img, (bar_x - 10, too_deep_y), (bar_x + bar_width + 10, too_deep_y), (0, 0, 255), 3)
                cv2.putText(img, "Too Deep", (bar_x - 100, too_deep_y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Draw the "good squat" range
                good_squat_lower_y = 300 - int(np.interp(GOOD_SQUAT_LOWER_ANGLE, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0)) * bar_height / 100)
                good_squat_upper_y = 300 - int(np.interp(GOOD_SQUAT_UPPER_ANGLE, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0)) * bar_height / 100)
                
                # Draw the good range as a filled rectangle (alpha transparency isn't supported directly)
                overlay = img.copy()
                cv2.rectangle(overlay, (bar_x - 10, good_squat_lower_y), (bar_x + bar_width + 10, good_squat_upper_y), (0, 255, 0), cv2.FILLED)
                cv2.addWeighted(overlay, 0.5, img, 0.5, 0, img)  # Increased opacity from 0.3 to 0.5
                
                cv2.line(img, (bar_x - 10, good_squat_lower_y), (bar_x + bar_width + 10, good_squat_lower_y), (0, 255, 0), 2)
                cv2.line(img, (bar_x - 10, good_squat_upper_y), (bar_x + bar_width + 10, good_squat_upper_y), (0, 255, 0), 2)
                cv2.putText(img, "Good Depth", (bar_x - 120, good_squat_lower_y + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Draw "Minimum Required" range
                min_required_lower_y = 300 - int(np.interp(MIN_REQUIRED_LOWER_ANGLE, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0)) * bar_height / 100)
                min_required_upper_y = 300 - int(np.interp(MIN_REQUIRED_UPPER_ANGLE, (TOO_DEEP_ANGLE, STANDING_ANGLE), (100, 0)) * bar_height / 100)
                
                # Draw the minimum required range as a filled rectangle
                overlay = img.copy()
                cv2.rectangle(overlay, (bar_x - 10, min_required_lower_y), (bar_x + bar_width + 10, min_required_upper_y), (255, 165, 0), cv2.FILLED)
                cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)  # Apply transparency
                
                cv2.line(img, (bar_x - 10, min_required_lower_y), (bar_x + bar_width + 10, min_required_lower_y), (255, 165, 0), 2)
                cv2.line(img, (bar_x - 10, min_required_upper_y), (bar_x + bar_width + 10, min_required_upper_y), (255, 165, 0), 2)
                cv2.putText(img, "Min Required", (bar_x - 120, min_required_lower_y + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 165, 0), 2)
                
                # Set bar color based on depth using the new ranges
                if angle > MIN_REQUIRED_UPPER_ANGLE:  # Not deep enough
                    bar_color = (255, 165, 0)  # Orange (BGR format)
                    status = "TOO SHALLOW"
                    current_rep_not_deep_enough = True
                elif angle >= MIN_REQUIRED_LOWER_ANGLE and angle <= MIN_REQUIRED_UPPER_ANGLE:  # Minimum required range
                    bar_color = (255, 130, 0)  # Dark orange
                    status = "DEEPER!"
                    current_rep_not_deep_enough = True
                elif angle >= GOOD_SQUAT_LOWER_ANGLE and angle <= GOOD_SQUAT_UPPER_ANGLE:  # Good squat depth
                    bar_color = (0, 255, 0)  # Green
                    status = "GOOD!"
                    current_rep_not_deep_enough = False
                    current_rep_too_deep = False
                elif angle < TOO_DEEP_ANGLE:  # Too deep
                    bar_color = (0, 0, 255)  # Red
                    status = "TOO DEEP"
                    current_rep_too_deep = True
                else:  # Between good and too deep
                    bar_color = (0, 255, 255)  # Yellow
                    status = "GOOD"
                    current_rep_not_deep_enough = False
                
                # Fill the progress bar with the appropriate color
                cv2.rectangle(img, (bar_x, 300), (bar_x + bar_width, 300 - filled_height), bar_color, cv2.FILLED)
                
                # Display current status
                cv2.putText(img, status, (bar_x - 120, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.8, bar_color, 2)
                
                # Rep counting logic - detect bottom of squat and returning to almost standing
                if not rep_counted and angle < GOOD_SQUAT_UPPER_ANGLE:  # Reached bottom of squat (good or deeper)
                    # Check for specific form issues
                    is_incorrect = False
                    
                    if angle < TOO_DEEP_ANGLE:  # Too deep
                        is_incorrect = True
                        incorrect_reason = "Too deep"
                    elif angle > MIN_REQUIRED_UPPER_ANGLE:  # Not deep enough (should not happen in this condition)
                        is_incorrect = True
                        incorrect_reason = "Not deep enough"
                    elif current_rep_knees_caved:  # Knee caving detected
                        is_incorrect = True
                        incorrect_reason = "Knees caving inward"
                    
                    # Count the rep and classify as good or bad
                    if not is_incorrect:
                        # Good rep
                        counter += 1
                        rep_counted = True
                        
                        # Store rep data for visualization
                        session_data["rep_markers"].append(len(session_data["frame_count"]))
                        session_data["rep_knee_angles"].append(min_angle_in_current_rep)
                        session_data["rep_feedback"].append("Good form")
                        
                        # Display counter
                        cv2.putText(img, f"Reps: {counter}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                        
                        # Check if we've reached the max reps for the session
                        if counter >= MAX_REPS_PER_SESSION and not session_complete:
                            session_complete = True
                            session_completed_time = time.time()
                            print(f"Session completed! {MAX_REPS_PER_SESSION} reps finished.")
                            cv2.putText(img, "Now take rest", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    else:
                        # Incorrect rep
                        incorrect_counter += 1
                        incorrect_rep_counted = True
                        
                        # Update specific issue counters
                        if incorrect_reason == "Too deep":
                            too_deep_count += 1
                        elif incorrect_reason == "Not deep enough":
                            not_deep_enough_count += 1
                        elif incorrect_reason == "Knees caving inward":
                            knee_caving_count += 1
                        
                        # Store rep data for visualization
                        session_data["rep_markers"].append(len(session_data["frame_count"]))
                        session_data["rep_knee_angles"].append(min_angle_in_current_rep)
                        session_data["rep_feedback"].append(incorrect_reason)
                        
                        # Display counter with red color for issues
                        cv2.putText(img, f"Form Issues: {incorrect_counter}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    
                    # Reset minimum angles for next rep
                    min_angle_in_current_rep = 180
                    min_knee_ratio_in_current_rep = 2.0
                
                # Reset rep counting flag when standing up again
                if rep_counted and angle > STANDING_ANGLE - 20:
                    rep_counted = False
                    current_rep_knees_caved = False
                    current_rep_too_deep = False
                    current_rep_not_deep_enough = False
                
                # Reset incorrect rep flag when standing up
                if incorrect_rep_counted and angle > STANDING_ANGLE - 20:
                    incorrect_rep_counted = False
                
                # Store session data for visualization
                session_data["frame_count"].append(len(session_data["frame_count"]))
                session_data["knee_angles"].append(angle)
                
                # Display rep counter and angle
                cv2.putText(img, f"Reps: {counter}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(img, f"Angle: {int(angle)}°", (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Display knee caving warning if detected
                if current_rep_knees_caved:
                    cv2.putText(img, "Knees caving in!", (width//2 - 100, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        
        # Show the image
        cv2.imshow("Webcam Squat Trainer", img)
        
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
        create_session_graphs(session_data)
    
    print("Squat trainer session ended") 