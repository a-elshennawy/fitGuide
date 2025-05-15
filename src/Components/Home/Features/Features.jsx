export default function Features() {
  return (
    <>
      <div className="features">
        <div className="container-fluid">
          <div className="featuresInner row">
            <div className="headerText col-12">
              <h3>Key Features</h3>
            </div>
            <div className="keysPart col-12 row">
              <div className="keyItem fromBottom row col-12 col-lg-6">
                <div className="icon col-1">
                  <img src="imgs/icons8-paint-48.png" alt="" />
                </div>
                <div className="text col-10">
                  <h4>Personalized Dashboard</h4>
                  <p>
                    Track your workouts, nutrition, and progress all in one
                    place with an intuitive interface.
                  </p>
                </div>
              </div>
              <div className="keyItem fromBottom row col-12 col-lg-6">
                <div className="icon col-1">
                  <img src="imgs/icons8-chart-60.png" alt="" />
                </div>
                <div className="text col-10">
                  <h4>Progress Analytics</h4>
                  <p>
                    Detailed insights into your fitness journey with visual
                    progress tracking.
                  </p>
                </div>
              </div>
              <div className="keyItem fromBottom row col-12 col-lg-6">
                <div className="icon col-1">
                  <img src="imgs/icons8-robot-64.png" alt="" />
                </div>
                <div className="text col-10">
                  <h4>AI Form Analysis</h4>
                  <p>
                    Real-time exercise form feedback using advanced pose
                    estimation technology.
                  </p>
                </div>
              </div>
              <div className="keyItem fromBottom row col-12 col-lg-6">
                <div className="icon col-1">
                  <img src="imgs/icons8-salad-64.png" alt="" />
                </div>
                <div className="text col-10">
                  <h4>Smart Meal Planning</h4>
                  <p>
                    Customized nutrition recommendations based on your goals and
                    preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
