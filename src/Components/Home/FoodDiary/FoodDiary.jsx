export default function FoodDiary() {
  return (
    <>
      <div className="food">
        <div className="container">
          <div className="foodInner row">
            <div className="innerPart row col-lg-8 col-12">
              <div className="header row col-12">
                <img className="col-1" src="imgs/icons8-edit-64.png" alt="" />
                <h4 className="col-8">food diary</h4>
              </div>
              <div className="secPrt fromBottom col-12">
                <div className="head row">
                  <div className="text col-lg-4 col-3">
                    <h4>breakfast</h4>
                    <p>496 kcal</p>
                  </div>
                  <button className="addFood col-lg-2 col-3">+ add food</button>
                </div>
                <ul>
                  <li>
                    Oatmeal with Banana{" "}
                    <span className="float-end">220 kcal</span>
                  </li>
                  <li>
                    Boiled Eggs (2) <span className="float-end">156 kcal</span>
                  </li>
                  <li>
                    Greek Yogurt <span className="float-end">120 kcal</span>
                  </li>
                </ul>
              </div>
              <div className="secPrt fromBottom col-12">
                <div className="head row">
                  <div className="text col-lg-4 col-3">
                    <h4>lunch</h4>
                    <p>500 kcal</p>
                  </div>
                  <button className="addFood col-lg-2 col-3">+ add food</button>
                </div>
                <ul>
                  <li>
                    Grilled Chicken Salad{" "}
                    <span className="float-end">380 kcal</span>
                  </li>
                  <li>
                    Quinoa <span className="float-end">120 kcal</span>
                  </li>
                </ul>
              </div>
              <div className="secPrt fromBottom col-12">
                <div className="head row">
                  <div className="text col-lg-4 col-3">
                    <h4>Dinner</h4>
                    <p>421 kcal</p>
                  </div>
                  <button className="addFood col-lg-2 col-3">+ add food</button>
                </div>
                <ul>
                  <li>
                    Salmon Fillet <span className="float-end">412 kcal</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
