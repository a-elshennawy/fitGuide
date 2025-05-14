export default function DailySummary() {
  return (
    <>
      <div className="daily">
        <div className="container-fluid">
          <div className="innerPart row">
            <div className="dailySummary fromLeft col-5 row">
              <h3 className="col-10">daily summary</h3>

              <div className="targs row col-10">
                <div className="goal col-4">
                  <img src="imgs/icons8-target-48.png" alt="" />
                  <p>goal</p>
                  <h4>2200 kcal</h4>
                </div>
                <div className="food col-4">
                  <img
                    src="imgs/icons8-fork-and-knife-with-plate-48.png"
                    alt=""
                  />
                  <p>food intake</p>
                  <h4>1300 kcal</h4>
                </div>
                <div className="running col-4">
                  <img src="imgs/icons8-running-48.png" alt="" />
                  <p>remaining</p>
                  <h4>900 kcal</h4>
                </div>
              </div>

              <div className="tracs row col-10">
                <div className="protein col-4">
                  <p>protein</p>
                  <h4>
                    <span>85g</span>/180g
                  </h4>
                  <div className="progBar"></div>
                </div>
                <div className="carbs col-4">
                  <p>carbs</p>
                  <h4>
                    <span>140g</span>/250g
                  </h4>
                  <div className="progBar"></div>
                </div>
                <div className="fats col-4">
                  <p>fats</p>
                  <h4>
                    <span>32g</span>/70g
                  </h4>
                  <div className="progBar"></div>
                </div>
              </div>
            </div>
            <div className="weightTrack fromRight col-5">
              <h3>
                <img src="imgs/icons8-balance-48.png" alt="" /> weight tracker
              </h3>
              <h2>72 kg</h2>
              <p>previous: 73.2 kg</p>
              <button className="updateW">update weight</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
