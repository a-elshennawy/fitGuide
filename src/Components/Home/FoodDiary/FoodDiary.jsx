import { useEffect, useState, useContext, useMemo } from "react";
import { UserContext } from "../../Contexts/UserContext";
import LoadingSpinner from "../../loadingSpinner";
import { Helmet } from "react-helmet";

export default function FoodDiary() {
  const { currentUser } = useContext(UserContext);
  const [allFoodItems, setAllFoodItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [loadingDiary, setLoadingDiary] = useState(true);
  const [foodsError, setFoodsError] = useState("");
  const [diaryError, setDiaryError] = useState("");
  const [addingFood, setAddingFood] = useState(false);

  const getTodayDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchAllFoodItems = async () => {
      if (!currentUser || !currentUser.token) {
        setLoadingFoods(false);
        setFoodsError("Please log in to view food items.");
        return;
      }

      setLoadingFoods(true);
      setFoodsError("");

      const headers = {
        Authorization: `Bearer ${currentUser.token}`,
        "Content-Type": "application/json",
      };

      try {
        const response = await fetch(
          "https://myfirtguide.runasp.net/api/HomeContoller/getAllFood",
          {
            method: "POST",
            headers: headers,
            body: JSON.stringify({}),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("All Food Items API Response:", data);
          setAllFoodItems(data);
        } else {
          const errorText = await response.text();
          console.error(
            "Failed to fetch all food items:",
            response.status,
            errorText
          );
          setFoodsError(`Failed to load food items: ${response.statusText}.`);
          setAllFoodItems([]);
        }
      } catch (err) {
        console.error("Error fetching all food items:", err);
        setFoodsError("An error occurred while loading food items.");
      } finally {
        setLoadingFoods(false);
      }
    };

    fetchAllFoodItems();
  }, [currentUser]);

  const fetchFoodDiary = async () => {
    if (!currentUser || !currentUser.token) {
      setLoadingDiary(false);
      setDiaryError("Please log in to view your food diary.");
      return;
    }

    setLoadingDiary(true);
    setDiaryError("");

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    const todayDate = getTodayDate();

    const apiUrl = `https://myfirtguide.runasp.net/api/HomeContoller/FoodDiary?date=${encodeURIComponent(
      todayDate
    )}`;

    console.log("Fetching food diary from URL (with param):", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Food Diary API Raw Response:", data);

        const formattedEntries = data.map((entry) => ({
          id: entry.id,
          name: entry.foodName,
          calories: entry.calories,
        }));
        setDiaryEntries(formattedEntries);
      } else if (response.status === 404) {
        const errorText = await response.text();
        console.warn("Food diary returned 404:", errorText);
        if (errorText.includes("No logs found for the specified date")) {
          setDiaryEntries([]);
          setDiaryError("");
        } else {
          setDiaryError(
            `Failed to load diary entries: ${response.statusText}. Details: ${errorText}`
          );
          setDiaryEntries([]);
        }
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to fetch food diary:",
          response.status,
          errorText
        );
        setDiaryError(
          `Failed to load diary entries: ${response.statusText}. Details: ${errorText}`
        );
        setDiaryEntries([]);
      }
    } catch (err) {
      console.error("Error fetching food diary:", err);
      setDiaryError("An error occurred while loading diary entries.");
      setDiaryEntries([]);
    } finally {
      setLoadingDiary(false);
    }
  };

  useEffect(() => {
    fetchFoodDiary();
  }, [currentUser, addingFood]);

  const filteredFoods = useMemo(() => {
    if (!searchTerm) {
      return [];
    }
    return allFoodItems.filter((food) =>
      food.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allFoodItems]);

  const handleAddFood = async () => {
    if (!selectedFood || quantity <= 0) {
      alert("Please select a food and enter a valid quantity.");
      return;
    }
    if (!currentUser || !currentUser.token) {
      alert("Please log in to add food to your diary.");
      return;
    }

    setAddingFood(true);

    const headers = {
      Authorization: `Bearer ${currentUser.token}`,
    };

    const encodedFoodName = encodeURIComponent(selectedFood.name);
    const apiUrl = `https://myfirtguide.runasp.net/api/HomeContoller/AddFood?FoodName=${encodedFoodName}&Quantity=${quantity}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
      });

      if (response.ok) {
        console.log("Food added successfully!");
        const newEntry = {
          name: selectedFood.name,
          calories: Math.round(selectedFood.caloriesPerServing * quantity),
          id: Date.now(),
        };
        setDiaryEntries((prevEntries) => [...prevEntries, newEntry]);

        setSelectedFood(null);
        setSearchTerm("");
        setQuantity(1);
      } else {
        const errorText = await response.text();
        console.error("Failed to add food:", response.status, errorText);
        alert(`Failed to add food: ${response.statusText}. ${errorText}`);
      }
    } catch (err) {
      console.error("Error adding food:", err);
      alert("An error occurred while adding food. Check console for details.");
    } finally {
      setAddingFood(false);
    }
  };

  const totalCaloriesToday = useMemo(() => {
    return diaryEntries.reduce((total, entry) => total + entry.calories, 0);
  }, [diaryEntries]);

  if (loadingFoods) {
    return <LoadingSpinner />;
  }

  if (foodsError) {
    return (
      <div className="text-danger p-3">
        <p>Error loading food items: {foodsError}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>FitGuide - Food Diary</title>
      </Helmet>
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
                  <div className="food-search-container col-12 mb-3">
                    <div className="row g-2">
                      <div className="inpContainer col-md-8 col-7">
                        <div className="dropdown">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search for food..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setSelectedFood(null);
                            }}
                          />
                          {searchTerm && (
                            <ul className="dropdown-menu show w-100">
                              {filteredFoods.length > 0 ? (
                                filteredFoods.map((food) => (
                                  <li
                                    key={food.id}
                                    className="dropdown-item"
                                    onClick={() => {
                                      setSelectedFood(food);
                                      setSearchTerm(food.name);
                                    }}
                                  >
                                    {food.name} ({food.caloriesPerServing} kcal)
                                  </li>
                                ))
                              ) : (
                                <li className="dropdown-item">
                                  No foods found
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="inpContainer col-md-2 col-3">
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                        />
                      </div>
                      <div className="col-md-2 col-2">
                        <button
                          className="addFood w-100"
                          onClick={handleAddFood}
                          disabled={!selectedFood || addingFood}
                        >
                          {addingFood ? "Adding..." : "Add +"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {loadingDiary ? (
                  <LoadingSpinner />
                ) : diaryEntries.length === 0 ? (
                  <p className="text-center text-muted">
                    No food added for today yet.
                  </p>
                ) : (
                  <ul>
                    {diaryEntries.map((entry, index) => (
                      <li key={entry.id || entry.name || index}>
                        {entry.name}{" "}
                        <span className="float-end">
                          {entry.calories.toFixed(2)} kcal
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {diaryEntries.length > 0 && !loadingDiary && (
                  <div className="total-calories mt-3">
                    <h5 className="text-end">
                      Total Calories Today: {totalCaloriesToday.toFixed(2)} kcal
                    </h5>
                  </div>
                )}
                {diaryError && (
                  <div className="text-danger mt-3">
                    <p>{diaryError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
