import { useEffect } from "react";
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./App.css";
import Layout from "./Components/Layout/Layout";
import LoadingSpinner from "./Components/loadingSpinner";

const Home = lazy(() => import("./Components/Home/Home"));
const Workouts = lazy(() => import("./Components/Workouts/Workouts"));
const Profile = lazy(() => import("./Components/Profile/Profile"));
const Sign_In = lazy(() => import("./Components/Sign_In/Sign_In"));
const Sign_Up = lazy(() => import("./Components/Sign_Up/Sign_Up"));
const Body_Metrics = lazy(() =>
  import("./Components/Body_Metrics/Body_Metrics")
);
const HealthConditions = lazy(() =>
  import("./Components/HealthConditions/HealthConditions")
);
const GoalSumm = lazy(() => import("./Components/GoalSumm/GoalSumm"));
const WorkoutFeedBack = lazy(() =>
  import("./Components/WorkoutFeedBack/WorkoutFeedBack")
);
const WorkoutNOtAvailabeYet = lazy(() =>
  import("./Components/WorkoutNOtAvailabeYet/WorkoutNOtAvailabeYet")
);

const createRoute = (path, element) => ({
  path,
  element,
});

function App() {
  const routes = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,

      children: [
        createRoute("", <Home />),
        createRoute("workout", <Workouts />),
        createRoute("profile", <Profile />),
        createRoute("/workoutFeedback", <WorkoutFeedBack />),
      ],
    },
    createRoute("/SignIn", <Sign_In />),
    createRoute("/signUp", <Sign_Up />),
    createRoute("/bodymetrics", <Body_Metrics />),
    createRoute("/healthconditions", <HealthConditions />),
    createRoute("/GoalSumm", <GoalSumm />),
    createRoute("/WorkoutNotAvailableYet", <WorkoutNOtAvailabeYet />),
  ]);

  useEffect(() => {
    if (window.setupRouterBridge) {
      window.setupRouterBridge({
        navigate: (path, options) => {
          window.location.href = path;
        },
      });
    }
  }, []);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouterProvider router={routes} />
    </Suspense>
  );
}

export default App;
