# FitGuide - AI-Powered Fitness Companion

FitGuide is a comprehensive web application that provides personalized workout plans, real-time AI form correction, and nutrition guidance tailored to individual fitness goals and needs.

## Features

### 🎯 Core Functionality
- **Personalized Workout Plans**: Customized training programs that adapt to fitness level, goals, and physical limitations
- **AI Form Correction**: Real-time pose estimation and feedback during exercises using advanced AI models
- **Nutrition Planning**: Personalized meal recommendations and macro tracking
- **Progress Analytics**: Detailed insights into fitness journey with visual progress tracking
- **Daily Summary Dashboard**: Track workouts, nutrition, and progress in one intuitive interface

### 💪 Workout Features
- Support for multiple exercises (Push-ups, Squats, Bicep Curls, Tricep Extensions)
- Real-time performance scoring
- Video tutorials for each exercise
- Customizable workout plans based on gym frequency and experience level
- Exercise logs with AI-powered feedback

### 🍽️ Nutrition Features
- Food diary with calorie tracking
- Macro breakdown (Protein, Carbs, Fats)
- Daily calorie goal monitoring
- Comprehensive food database
- Easy food search and entry system

### 📊 Progress Tracking
- Weight tracking over time
- BMI calculations and targets
- Muscle mass and body fat monitoring
- Goal progression visualization
- Detailed metrics history

## Tech Stack

- **Frontend Framework**: React 18 with Vite
- **Routing**: React Router DOM
- **Styling**: 
  - Bootstrap 5
  - Custom CSS with animations
  - Responsive design for all devices
- **State Management**: React Context API
- **Icons**: Font Awesome
- **Loading Indicators**: React Spinners
- **AI Models**: Custom pose estimation models for exercise form analysis

## Project Structure

```
src/
├── Components/
│   ├── Body_Metrics/          # Body metrics input and tracking
│   ├── Contexts/              # React Context providers
│   ├── Footer/                # Footer component
│   ├── GoalSumm/             # Goal summary page
│   ├── GuestNavbar/          # Navigation for non-authenticated users
│   ├── HealthConditions/     # Health conditions and injury tracking
│   ├── Home/                 # Home page components
│   │   ├── DailySummary/     # Daily nutrition and calorie summary
│   │   ├── Features/         # Key features showcase
│   │   ├── FoodDiary/        # Food logging interface
│   │   ├── Header/           # Landing page header
│   │   ├── HowTo/            # How it works section
│   │   ├── Start/            # Call-to-action section
│   │   └── TodayWorkout/     # Today's workout display
│   ├── Layout/               # Main layout wrapper
│   ├── NavBar/               # Navigation for authenticated users
│   ├── Profile/              # User profile page
│   ├── Sign_In/              # Login page
│   ├── Sign_Up/              # Registration page
│   ├── WorkoutFeedBack/      # Post-workout feedback display
│   ├── WorkoutNOtAvailabeYet/ # Placeholder for unavailable workouts
│   ├── Workouts/             # Workout plans and exercises
│   ├── UpBtn.jsx             # Scroll-to-top button
│   └── loadingSpinner.jsx    # Loading indicator
├── App.jsx                   # Main app component
├── App.css                   # Global styles
├── Animations.css            # Animation keyframes
├── fonts.css                 # Custom font definitions
└── main.jsx                  # Application entry point
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fitguide.git
cd fitguide
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## User Journey

### 1. Registration & Onboarding
- Create account with personal information
- Input body metrics (weight, height, body fat %, etc.)
- Select fitness goals
- Choose workout plan preference
- Report any health conditions, injuries, or allergies

### 2. Goal Summary
- Review personalized fitness targets
- See projected changes in weight, BMI, muscle mass, and body fat
- Confirm and start fitness journey

### 3. Daily Usage
- View daily calorie and macro targets
- Log food intake throughout the day
- Complete assigned workouts with AI form correction
- Track weight and body metrics
- Review performance feedback

### 4. Workout Execution
- Follow today's workout plan
- Watch tutorial videos for each exercise
- Perform exercises with real-time AI feedback
- Receive performance scores and form corrections
- Save workout sessions to history

### 5. Progress Monitoring
- View profile with all metrics and goals
- Track progress over time
- Update metrics regularly
- Adjust workout plans as needed

## API Integration

The application integrates with a RESTful API hosted at `https://myfirtguide.runasp.net/api/` with the following main endpoints:

- **Account Management**: Registration, login, email validation
- **User Metrics**: Track and update body measurements
- **Goals**: Select and manage fitness goals
- **Workouts**: Generate and retrieve personalized workout plans
- **Nutrition**: Access food database and log daily intake
- **Exercise Logs**: Save workout sessions and receive feedback
- **Health Data**: Manage injuries and allergies

## Authentication

The app uses token-based authentication:
- JWT tokens are received upon login
- Tokens are stored in localStorage via UserContext
- All API requests include Authorization header with Bearer token
- Automatic logout and redirect to login on token expiration

## Responsive Design

FitGuide is fully responsive with breakpoints for:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (up to 767px)

## AI Models

The application includes custom AI models for exercise form analysis:
- **Push-up Analysis**: `/AI_Models/pushup/index.html`
- **Squat Analysis**: `/AI_Models/squat/index.html`
- **Bicep Curl Analysis**: `/AI_Models/bicepCurl/index.html`
- **Tricep Extension Analysis**: `/AI_Models/tricep/index.html`

Each model provides:
- Real-time pose estimation
- Form correction feedback
- Performance scoring
- Rep counting

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Key Features Implementation

### Context API Usage
The app uses React Context for global state management:
- `UserContext`: Stores authenticated user data and token
- Persists user session in localStorage
- Provides logout functionality across the app

### Animation System
Custom CSS animations enhance user experience:
- `fromLeft`: Elements slide in from left
- `fromRight`: Elements slide in from right
- `fromBottom`: Elements slide in from bottom
- Animations trigger on scroll using CSS scroll-timeline

### Modal Management
Bootstrap modals used for:
- Updating body metrics
- Switching workout plans
- Displaying workout feedback

## Environment Considerations

**Important**: The application uses localStorage for authentication. When deployed, ensure:
- HTTPS is enabled for secure token storage
- CORS is properly configured on the API
- API endpoints are accessible from the deployment domain

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## Acknowledgments

- Icons from [Icons8](https://icons8.com/)
- Country data from [REST Countries API](https://restcountries.com/)
- Food database provided by FitGuide API
- AI pose estimation models custom-built for fitness form analysis

## Support

For support, email support@fitguide.com or open an issue in the repository.

---

**Built with ❤️ for fitness enthusiasts everywhere**
