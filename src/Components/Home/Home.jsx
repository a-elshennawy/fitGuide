import DailySummary from "./DailySummary/DailySummary";
import Features from "./Features/Features";
import Header from "./Header/Header";
import HowTo from "./HowTo/HowTo";
import Start from "./Start/Start";
import { Helmet } from "react-helmet";
import TodayWorkout from "./TodayWorkout/TodayWorkout";
import FoodDiary from "./FoodDiary/FoodDiary";
import UpBtn from "../UpBtn";

export default function Home() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  return (
    <>
      <Helmet>
        <title>FitGuide - Home</title>
      </Helmet>

      {currentUser ? (
        <>
          <DailySummary />
          <TodayWorkout />
          <FoodDiary />
        </>
      ) : (
        <>
          <Header />
          <HowTo />
          <Start />
          <Features />
        </>
      )}

      <UpBtn />
    </>
  );
}
