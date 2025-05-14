import UpBtn from "../UpBtn";

export default function Workouts() {
  return (
    <>
      <div className="workouts">
        <div className="container-fluid">
          <div className="workoutsInner row">
            <div className="workoutItems col-10 row">
              <div className="workout fromBottom row col-8">
                <div className="img col-1">
                  <img src="imgs/icons8-deadlift-50.png" alt="" />
                </div>
                <div className="details col-9">
                  <h4>squats</h4>
                  <p>targets legs and gluts</p>
                </div>
                <div className="reps col-2">
                  <h4>3 x 12</h4>
                </div>
                <div className="try col-12">
                  <button className="tryBtn">try it</button>
                </div>
              </div>

              <div className="workout fromBottom row col-8">
                <div className="img col-1">
                  <img src="imgs/icons8-arm-50.png" alt="" />
                </div>
                <div className="details col-9">
                  <h4>push-ups</h4>
                  <p>builds chest and triceps</p>
                </div>
                <div className="reps col-2">
                  <h4>3 x 10</h4>
                </div>
                <div className="try col-12">
                  <button className="tryBtn">try it</button>
                </div>
              </div>

              <div className="workout fromBottom row col-8">
                <div className="img col-1">
                  <img src="imgs/icons8-deadlift-50.png" alt="" />
                </div>
                <div className="details col-9">
                  <h4>deadlift</h4>
                  <p>full body compound movement</p>
                </div>
                <div className="reps col-2">
                  <h4>3 x 8</h4>
                </div>
                <div className="try col-12">
                  <button className="tryBtn">try it</button>
                </div>
              </div>
            </div>

            <div className="upcoming col-10 row">
              <h3 className="col-10">upcoming workouts</h3>
              <div className="upSec tomorrow fromLeft col-5">
                <h5>tomorrow</h5>
                <ul>
                  <li>bench press</li>
                  <li>rows</li>
                  <li>shoulder press</li>
                </ul>
              </div>
              <div className="upSec nextWeek fromRight col-5">
                <h5>next week</h5>
                <ul>
                  <li>leg press</li>
                  <li>lunges</li>
                  <li>calf raises</li>
                </ul>
              </div>
              <div className="btns fromLeft col-10">
                <button className="switch">🔄 Switch Plan</button>
                <button className="edit">✏ Edit Plan</button>
                <button className="delete">🗑 Delete Plan</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UpBtn />
    </>
  );
}
