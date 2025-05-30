const express = require('express');
const cors = require('cors');
const fs = require('fs');  // Change to regular fs instead of fs.promises
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Create videos directory if it doesn't exist
const videosDir = path.join(__dirname, 'video_records');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
}

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, videosDir);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `tricep-workout-${timestamp}.webm`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/webm') {
            cb(null, true);
        } else {
            cb(new Error('Only .webm format allowed!'), false);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max file size
    }
});

// Use absolute path for history file
const HISTORY_FILE = path.join(__dirname, 'workout_history.json');

// Initialize history file if it doesn't exist
async function initializeHistoryFile() {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
        } else {
            // Read the file to ensure it's valid JSON
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            try {
                JSON.parse(data);
            } catch (e) {
                // If file exists but isn't valid JSON, initialize it
                fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
            }
        }
        console.log('History file initialized at:', HISTORY_FILE);
    } catch (error) {
        console.error('Error initializing history file:', error);
        // Create the file with empty array if there's any error
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
    }
}

// Clean tricep workout data to match required structure
function cleanWorkoutData(workoutData) {
    const totalReps = workoutData.sessionData.reps?.total || 0;
    const badReps = workoutData.sessionData.badReps?.total || 0;
    const goodReps = totalReps - badReps;
    const date = new Date(workoutData.timestamp);

    return {
        workoutName: "Tricep Pushdown",
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        sets: 1,
        reps: {
            total: totalReps,
            correct: goodReps,
            incorrect: badReps
        },
        formIssues: {
            elbowSwinging: workoutData.sessionData.badReps?.elbow_swinging || 0,
            backTooTilted: workoutData.sessionData.badReps?.back_too_tilted || 0,
            backTooStraight: workoutData.sessionData.badReps?.back_too_straight || 0
        },
        performanceScore: Math.round((goodReps / totalReps) * 100) || 0,
        sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2),
        sessionData: {
            rep_feedback: workoutData.sessionData.rep_feedback || [],
            saved: true
        }
    };
}

// Save tricep workout data
app.post('/api/save-tricep-workout', (req, res) => {
    try {
        const workoutData = cleanWorkoutData(req.body);
        
        // Read existing data
        let history = [];
        try {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            history = JSON.parse(data);
            if (!Array.isArray(history)) {
                history = [];
            }
        } catch (error) {
            console.error('Error reading history file:', error);
        }

        // Add new workout
        history.push(workoutData);
        
        // Keep only last 20 workouts
        if (history.length > 20) {
            history = history.slice(-20);
        }

        // Save back to file with pretty formatting
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        console.log('Workout saved successfully to:', HISTORY_FILE);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving workout data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get tricep workout history
app.get('/api/tricep-workout-history', (req, res) => {
    try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        const history = JSON.parse(data);
        res.json(history);
    } catch (error) {
        console.error('Error reading workout history:', error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint for video upload
app.post('/api/upload-video', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }
    res.json({ 
        success: true, 
        filename: req.file.filename,
        path: `/video_records/${req.file.filename}`
    });
});

// New endpoint to get list of recorded videos
app.get('/api/videos', (req, res) => {
    try {
        const files = fs.readdirSync(videosDir);
        const videos = files
            .filter(file => file.endsWith('.webm'))
            .map(file => ({
                filename: file,
                path: `/video_records/${file}`,
                timestamp: new Date(file.split('-')[2].split('.')[0]).toLocaleString()
            }));
        res.json({ success: true, videos });
    } catch (error) {
        console.error('Error reading videos directory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Initialize history file and start server
initializeHistoryFile().then(() => {
    app.listen(port, () => {
        console.log(`Tricep trainer server running at http://localhost:${port}`);
        console.log('Saving workout history to:', HISTORY_FILE);
        console.log('Saving videos to:', videosDir);
    });
}); 