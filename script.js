let map;
let marker;
let rainChart;
let gaugeChart;

const API_KEY = "YOUR_OPENWEATHER_API_KEY";

// MAIN FUNCTION
async function getPrediction() {
    const city = document.getElementById("city").value;

    try {
        const res = await fetch(`http://127.0.0.1:8000/predict_by_city?city=${city}`);
        const data = await res.json();

        console.log("API DATA:", data); // 🔥 DEBUG

        updateUI(data);
        updateMap(data.lat, data.lon, city);
        generateInsight(data);
        createRainChart(data.rain_forecast);

    } catch (err) {
        console.error(err);
        alert("Backend issue");
    }
}

function updateUI(data) {

    // 🔥 CORRECT ACCESS
    document.getElementById("temp").innerText = data.weather?.temperature ?? 0;
    document.getElementById("humidity").innerText = data.weather?.humidity ?? 0;
    document.getElementById("rain").innerText = data.weather?.rainfall_1h ?? 0;

    // river level number → text
    let riverText = data.river_level === 3 ? "High"
                   : data.river_level === 2 ? "Medium"
                   : "Low";

    document.getElementById("river").innerText = riverText;

    // probability (0–1 → %)
    const prob = (data.probability * 100).toFixed(2);
    document.getElementById("prob").innerText = prob;

    // prediction is already string
    const status = document.getElementById("status");
    status.innerText = data.prediction;

    status.style.color = data.prediction.includes("🚨") ? "red" : "green";

    createGauge(prob);
}
function createGauge(prob) {
    const ctx = document.getElementById("gaugeChart");

    if (gaugeChart) gaugeChart.destroy();

    gaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [prob, 100 - prob],
                backgroundColor: ['#003461', '#e6e6e6']
            }]
        },
        options: {
            cutout: '75%',
            plugins: { tooltip: { enabled: false } }
        },
        plugins: [{
            beforeDraw(chart) {
                const ctx = chart.ctx;
                const width = chart.width;

                ctx.restore();
                ctx.font = "bold 20px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(prob + "%", width / 2, 90);
            }
        }]
    });
}


function createRainChart(rainData) {
    const ctx = document.getElementById("rainChart");

    if (rainChart) rainChart.destroy();

    const labels = rainData.map((_, i) => i + "h");

    rainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: "Rain Forecast (mm)",
                data: rainData,
                borderColor: "#003461",
                tension: 0.4,
                fill: true
            }]
        }
    });
}


function updateMap(lat, lon, city) {

    if (!lat || !lon) {
        alert("Location not found");
        return;
    }

    if (!map) {
        map = L.map('map').setView([lat, lon], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
            .addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }

    if (marker) {
        marker.setLatLng([lat, lon]);
    } else {
        marker = L.marker([lat, lon]).addTo(map);
    }

    marker.bindPopup(city).openPopup();
}


function generateInsight(data) {
    let prob = data.probability;

    let msg = "";

    if (prob > 0.7) {
        msg = "⚠️ Heavy rainfall & high moisture → flood likely.";
    } else if (prob > 0.4) {
        msg = "Moderate conditions. Stay alert.";
    } else {
        msg = "Safe weather conditions.";
    }

    document.getElementById("insight").innerText = msg;
}