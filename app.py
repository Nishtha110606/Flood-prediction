from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

WEATHER_API_KEY = "36d7866610d2b37b8e73a347215dd389"
LOCATION_API_KEY = "pk.efc2bd1770e80a5492f9586679a50cda "

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Flood API running"}

# LOCATION
def get_location(city):
    url = f"https://us1.locationiq.com/v1/search.php?key={LOCATION_API_KEY}&q={city}&format=json"
    res = requests.get(url).json()

    if not res:
        return None, None

    return float(res[0]["lat"]), float(res[0]["lon"])

# WEATHER
def get_weather(lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
    data = requests.get(url).json()

    return {
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "rainfall_1h": data.get("rain", {}).get("1h", 0)
    }

# FORECAST
def get_forecast(lat, lon):
    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
    data = requests.get(url).json()

    rain_list = []
    total = 0

    for item in data["list"]:
        rain = item.get("rain", {}).get("3h", 0)
        rain_list.append(rain)
        total += rain

    return total, rain_list

# MAIN API
@app.get("/predict_by_city")
def predict(city: str):

    try:
        lat, lon = get_location(city)
        if lat is None:
            return {"error": "City not found"}

        weather = get_weather(lat, lon)
        total_rain, rain_list = get_forecast(lat, lon)

        river_level = 3 if total_rain > 120 else 2 if total_rain > 60 else 1
        soil_moisture = weather["humidity"] * 0.6 + total_rain * 0.4

        # 🔥 IMPROVED FLOOD LOGIC
        rain_score = total_rain / 200
        humidity_score = weather["humidity"] / 100
        soil_score = soil_moisture / 100

        if total_rain < 5:
            probability = (humidity_score * 0.1)
        else:
            probability = (
                rain_score * 0.6 +
                humidity_score * 0.25 +
                soil_score * 0.15
            )

        probability = min(1, probability)

        prediction = "🚨 High Flood Risk" if probability > 0.5 else "✅ Safe"

        return {
            "city": city,
            "lat": lat,
            "lon": lon,
            "weather": weather,
            "rain_forecast": rain_list[:10],
            "total_rainfall": round(total_rain, 2),
            "river_level": river_level,
            "soil_moisture": round(soil_moisture, 2),
            "probability": round(probability, 4),
            "prediction": prediction
        }

    except Exception as e:
        return {"error": str(e)}