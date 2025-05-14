export default function TodayWorkout() {
  return (
    <>
      <div className="TodayWorkout">
        <div className="container">
          <div className="todayInner row">
            <div className="innerPart row col-8">
              <div className="header row col-12">
                <img
                  className="col-2"
                  src="imgs/icons8-deadlift-50.png"
                  alt=""
                />
                <h4 className="col-8">Today's Workout Plan</h4>
                <h6 className="col-3">Beginner Strength Plan</h6>
              </div>
              <div className="workout fromBottom row col-12">
                <img
                  className="col-3"
                  src="imgs/icons8-deadlift-50.png"
                  alt=""
                />
                <div className="text col-10">
                  <h4>squats</h4>
                  <p>3 sets x 12</p>
                </div>
              </div>
              <div className="workout fromBottom row col-12">
                <img className="col-3" src="imgs/icons8-arm-50.png" alt="" />
                <div className="text col-10">
                  <h4>push ups</h4>
                  <p>3 sets x 10</p>
                </div>
              </div>
              <div className="workout fromBottom row col-12">
                <img className="col-3" src="imgs/icons8-plank-64.png" alt="" />
                <div className="text col-10">
                  <h4>plank</h4>
                  <p>3 sets x 45s</p>
                </div>
              </div>
              <div className="btnSec fromRight col-12">
                <button className="startBtn">start workout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
