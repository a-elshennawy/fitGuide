export default function HowTo() {
  return (
    <>
      <div className="howTo">
        <div className="container-fluid">
          <div className="HowToInner row">
            <div className="headerText col-12">
              <h3>how FitGuide works</h3>
            </div>
            <div className="itemsPart row col-11">
              <div className="item fromLeft col-10 col-lg-3">
                <div className="icon">
                  <img src="imgs/icons8-plan-80.png" alt="" />
                </div>
                <div className="text">
                  <h4>1. Profile Setup</h4>
                  <p>
                    Tell us about your goals, fitness level, and any limitations
                  </p>
                </div>
              </div>
              <div className="item fromLeft col-10 col-lg-3">
                <div className="icon">
                  <img src="imgs/icons8-arm-50.png" alt="" />
                </div>
                <div className="text">
                  <h4>2. Custom Plan</h4>
                  <p>Receive your personalized workout and nutrition plan</p>
                </div>
              </div>
              <div className="item fromRight col-10 col-lg-3">
                <div className="icon">
                  <img src="imgs/icons8-phone-48.png" alt="" />
                </div>
                <div className="text">
                  <h4>3. Train Smart</h4>
                  <p>Get real-time feedback during workouts</p>
                </div>
              </div>
              <div className="item fromRight col-10 col-lg-3">
                <div className="icon">
                  <img src="imgs/icons8-progress-32.png" alt="" />
                </div>
                <div className="text">
                  <h4>4. Track Progress</h4>
                  <p>
                    Monitor your improvements and adjust plans automatically
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
