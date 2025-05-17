document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const extra = document.getElementById("extra");
  const cityInput = document.getElementById("city-input");
  const cityBtn = document.getElementById("city-btn");
  const cityName = document.getElementById("city-name");
  const sky = document.getElementById("sky-bg");
  const sunScene = document.getElementById("sunScene");
  const moonScene = document.getElementById("moonScene");

  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const fmt = (d, t) => d.toLocaleTimeString("en-US", { timeZone: t });
  const fmtPH = (d) =>
    d.toLocaleTimeString("en-US", { timeZone: "Asia/Manila" });
  const fmtFull = (d, t) => d.toLocaleString("en-US", { timeZone: t });

  function showScene(dayPhase) {
    // swap sky colours & scene visibility
    const map = {
      night: "from-gray-900 to-black",
      dawn: "from-orange-200 to-yellow-300",
      day: "from-sky-300   to-blue-500",
      dusk: "from-purple-600 to-pink-400",
    };
    sky.className = `absolute inset-0 bg-gradient-to-br ${map[dayPhase]} transition-colors duration-1000`;

    if (dayPhase === "night") {
      moonScene.classList.remove("hide");
      sunScene.classList.add("hide");
    } else {
      sunScene.classList.remove("hide");
      moonScene.classList.add("hide");
    }
  }

  function updatePhase(now, sunrise, sunset) {
    if (now < sunrise) {
      showScene("night");
      status.textContent = "🌌 It's before sunrise.";
    } else if (now - sunrise < 600000) {
      showScene("dawn");
      status.textContent = "🌄 The sun is rising.";
    } else if (now < sunset) {
      showScene("day");
      status.textContent = "🌞 It's daytime.";
    } else if (now - sunset < 600000) {
      showScene("dusk");
      status.textContent = "🌇 The sun is setting.";
    } else {
      showScene("night");
      status.textContent = "🌙 It's nighttime.";
    }
  }

  async function loadSun(lat, lng) {
    try {
      const data = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`
      ).then((r) => r.json());
      const now = new Date(),
        sunrise = new Date(data.results.sunrise),
        sunset = new Date(data.results.sunset);
      updatePhase(now, sunrise, sunset);
      extra.innerHTML = `<div>Sunrise: ${fmt(sunrise, tz)} | Sunset: ${fmt(
        sunset,
        tz
      )}</div>
             <div class="mt-1">Current time there: ${fmtFull(now, tz)}</div>
             <div class="text-xs text-gray-400 mt-1">(PH Time — Sunrise: ${fmtPH(
               sunrise
             )}, Sunset: ${fmtPH(sunset)}, Current: ${fmtPH(now)})</div>`;
    } catch {
      status.textContent = "⚠️ Error retrieving sun data.";
    }
  }

  async function geoSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    loadSun(lat, lng);
    loadWeather(lat, lng);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();

      // Try to get city/town/village, fallback to state
      const address = data.address;
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.county ||
        "Unknown area";
      const country = address.country || "";

      cityName.textContent = `${city}, ${country}`;
    } catch (e) {
      console.error("Reverse geocoding error:", e);
      cityName.textContent = "Current Location";
    }
  }

  function geoError() {
    status.textContent = "Please turn on your location";
  }

  navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(geoSuccess, geoError)
    : geoError();

  cityBtn.addEventListener("click", async () => {
    const city = cityInput.value.trim();
    if (!city) {
      status.textContent = "Please enter a city name.";
      return;
    }
    status.textContent = "🔎 Searching…";
    extra.textContent = "";
    try {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1`
      ).then((r) => r.json());
      if (!g.results || !g.results.length) {
        status.textContent = "City not found.";
        return;
      }
      const { latitude, longitude, name, country, timezone } = g.results[0];
      tz = timezone || tz;
      cityName.textContent = `${name}, ${country}`;
      status.textContent = "🌐 City data loaded.";
      loadSun(latitude, longitude);
      loadWeather(latitude, longitude);
    } catch {
      status.textContent = "⚠️ Error looking up city.";
    }
  });
});

async function loadWeather(lat, lng) {
  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    const temp = weatherData.current.temperature_2m;
    const code = weatherData.current.weathercode;
    const description = weatherCodeDescription(code);

    const weatherEl = document.getElementById("weather");
    weatherEl.textContent = `🌡️ ${temp}°C – ${description}`;
  } catch (err) {
    console.error("Weather error:", err);
    document.getElementById("weather").textContent = "⚠️ Weather unavailable.";
  }
}

function weatherCodeDescription(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}