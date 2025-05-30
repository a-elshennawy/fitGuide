const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const HISTORY_FILE = 'workout_history.json';
const VIDEO_DIRECTORY = 'video_records';

// Ensure video directory exists
async function ensureVideoDirectory() {
    try {
        await fs.access(VIDEO_DIRECTORY);
    } catch {
        await fs.mkdir(VIDEO_DIRECTORY);
    }
}

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, VIDEO_DIRECTORY);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `pushup_workout_${timestamp}.webm`);
    }
});

const upload = multer({ storage: storage });

// Initialize workout history file if it doesn't exist
async function initializeHistoryFile() {
    try {
        await fs.access(HISTORY_FILE);
    } catch {
        await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2));
    }
}

// Clean workout data by removing unnecessary arrays
function cleanWorkoutData(workoutData) {
    const date = new Date(workoutData.timestamp);
    
    return {
        workoutName: "Push-up",
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        reps: {
            total: workoutData.sessionData.reps.total || 0,
            correct: workoutData.sessionData.reps.correct || 0,
            incorrect: workoutData.sessionData.reps.incorrect || 0
        },
        formIssues: {
            elbowAngle: workoutData.sessionData.formIssues.elbowAngle || 0,
            backStraight: workoutData.sessionData.formIssues.backStraight || 0,
            bodyAlignment: workoutData.sessionData.formIssues.bodyAlignment || 0
        },
        performanceScore: workoutData.sessionData.performanceScore || 0,
        sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        sessionData: {
            rep_feedback: workoutData.sessionData.rep_feedback || [],
            saved: true
        }
    };
}

// Video upload endpoint
app.post('/api/upload-video', upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No video file uploaded');
        }
        res.json({
            success: true,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save workout data
app.post('/api/save-workout', async (req, res) => {
    try {
        const workoutData = req.body;
        
        // Read existing data
        let history = [];
        try {
            const data = await fs.readFile(HISTORY_FILE, 'utf8');
            history = JSON.parse(data);
        } catch (error) {
            console.error('Error reading history file:', error);
        }

        // Add new workout data
        history.push(workoutData);

        // Keep only the last 20 sessions
        if (history.length > 20) {
            history = history.slice(-20);
        }

        // Save back to file
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving workout data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get workout history
app.get('/api/workout-history', async (req, res) => {
    try {
        const data = await fs.readFile(HISTORY_FILE, 'utf8');
        const history = JSON.parse(data);
        res.json(history.map(entry => cleanWorkoutData(entry)));
    } catch (error) {
        console.error('Error reading workout history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize history file and video directory, then start server
Promise.all([initializeHistoryFile(), ensureVideoDirectory()]).then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}); 