document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");
  const extra = document.getElementById("extra");
  const cityInput = document.getElementById("city-input");
  const cityBtn = document.getElementById("city-btn");
  const cityName = document.getElementById("city-name");
  const sky = document.getElementById("sky-bg");
  const sunScene = document.getElementById("sunScene");
  const moonScene = document.getElementById("moonScene");
  let clockInterval;
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Formatting functions
  const fmt = (d, t) => d.toLocaleTimeString("en-US", { timeZone: t });
  const fmtPH = (d) => d.toLocaleTimeString("en-US", { timeZone: "Asia/Manila" });
  const fmtFull = (d, t) => d.toLocaleString("en-US", { timeZone: t });

  // Weather configuration (daytime only)
  const weatherBgMap = {
    "Clear sky": "from-sky-400 to-blue-600",
    "Mainly clear": "from-blue-300 to-indigo-500",
    "Partly cloudy": "from-gray-200 to-gray-400",
    "Overcast": "from-slate-400 to-slate-600",
    "Fog": "from-stone-400 to-stone-600",
    "Depositing rime fog": "from-slate-300 to-slate-500",
    "Light drizzle": "from-slate-400 to-slate-600",
    "Moderate drizzle": "from-slate-500 to-slate-700",
    "Dense drizzle": "from-slate-600 to-slate-800",
    "Slight rain": "from-sky-500 to-gray-600",
    "Moderate rain": "from-sky-600 to-gray-700",
    "Heavy rain": "from-sky-800 to-gray-900",
    "Slight snow fall": "from-gray-200 to-gray-400",
    "Moderate snow fall": "from-gray-300 to-gray-500",
    "Heavy snow fall": "from-gray-400 to-gray-600",
    "Thunderstorm": "from-purple-900 to-gray-900",
    "Thunderstorm with slight hail": "from-stone-800 to-stone-900",
    "Thunderstorm with heavy hail": "from-stone-900 to-black",
  };

  // Visual functions
  function showScene(dayPhase, weatherDescription = "") {
    const phaseMap = {
      night: "from-gray-900 via-gray-800 to-black",
      late_night: "from-gray-800 via-gray-700 to-gray-900",
      dawn: "from-purple-800 via-orange-600 to-amber-200",
      day: weatherBgMap[weatherDescription] || "from-sky-400 to-blue-500",
      dusk: "from-amber-400 via-red-600 to-purple-900"
    };

    // Force dark themes for night phases
    const gradient = phaseMap[dayPhase];
    sky.className = `absolute inset-0 bg-gradient-to-b ${gradient} transition-all duration-3000`;

    moonScene.classList.toggle("hide", !["night", "late_night"].includes(dayPhase));
    sunScene.classList.toggle("hide", !["dawn", "day", "dusk"].includes(dayPhase));

    // Celestial visibility with smooth transitions
    moonScene.classList.toggle("opacity-100", ["night", "late_night"].includes(dayPhase));
    moonScene.classList.toggle("opacity-0", !["night", "late_night"].includes(dayPhase));
    sunScene.classList.toggle("opacity-100", ["dawn", "day", "dusk"].includes(dayPhase));
    sunScene.classList.toggle("opacity-0", !["dawn", "day", "dusk"].includes(dayPhase));
  }

  function updatePhase(now, sunrise, sunset, weatherDescription) {
    const astronomicalTwilight = 3600000 * 1.5; 
    const hourBeforeSunrise = new Date(sunrise.getTime() - astronomicalTwilight);
    const hourAfterSunset = new Date(sunset.getTime() + astronomicalTwilight);

    if (now < hourBeforeSunrise) {
      showScene("night", weatherDescription);
      status.textContent = "🌌 Deep Night";
    } else if (now < sunrise) {
      showScene("late_night", weatherDescription);
      status.textContent = "🌠 Astronomical Twilight";
    } else if (now - sunrise < 3600000) {
      showScene("dawn", weatherDescription);
      status.textContent = "🌄 Morning Golden Hour";
    } else if (now < sunset) {
      showScene("day", weatherDescription);
      status.textContent = "🌞 Daylight Hours";
    } else if (now - sunset < 3600000) { 
      showScene("dusk", weatherDescription);
      status.textContent = "🌇 Evening Golden Hour";
    } else if (now < hourAfterSunset) {
      showScene("late_night", weatherDescription);
      status.textContent = "🌃 Nautical Twilight";
    } else {
      showScene("night", weatherDescription);
      status.textContent = "🌌 Deep Night";
    }
  }

  // Weather functions
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

  async function loadWeather(lat, lng, sunrise, sunset) {
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      const temp = weatherData.current.temperature_2m;
      const code = weatherData.current.weathercode;
      const description = weatherCodeDescription(code);

      document.getElementById(
        "weather"
      ).textContent = `🌡️ ${temp}°C – ${description}`;
      updatePhase(new Date(), sunrise, sunset, description);
    } catch (err) {
      console.error("Weather error:", err);
      document.getElementById("weather").textContent =
        "⚠️ Weather unavailable.";
    }
  }

  // Sun data and location functions
  async function loadSun(lat, lng) {
    try {
      const data = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`
      ).then((r) => r.json());

      const now = new Date();
      const sunrise = new Date(data.results.sunrise);
      const sunset = new Date(data.results.sunset);

      extra.innerHTML = `
        <div>Sunrise: ${fmt(sunrise, tz)} | Sunset: ${fmt(sunset, tz)}</div>
        <div class="mt-1">Current time there: <span id="local-time">${fmtFull(
          now,
          tz
        )}</span></div>
        <div class="text-xs text-orange-400 mt-1">
          (PH Time — Sunrise: ${fmtPH(sunrise)}, Sunset: ${fmtPH(
        sunset
      )}, Current: <span id="ph-time">${fmtPH(now)}</span>)
        </div>`;

      clearInterval(clockInterval);
      clockInterval = setInterval(() => {
        const now = new Date();
        document.getElementById("local-time").textContent = fmtFull(now, tz);
        document.getElementById("ph-time").textContent = fmtPH(now);
      }, 1000);

      loadWeather(lat, lng, sunrise, sunset);
    } catch {
      status.textContent = "⚠️ Error retrieving sun data.";
    }
  }

  async function geoSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    loadSun(lat, lng);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      const address = data.address;
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.county ||
        "Unknown area";
      cityName.textContent = `${city}, ${address.country || ""}`;
    } catch (e) {
      console.error("Reverse geocoding error:", e);
      cityName.textContent = "Current Location";
    }
  }

  function geoError() {
    status.textContent = "Please turn on your location";
  }

  // Initialization
  navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(geoSuccess, geoError)
    : geoError();

  // Event listeners
  cityBtn.addEventListener("click", async () => {
    const city = cityInput.value.trim();
    if (!city) return (status.textContent = "Please enter a city name.");

    status.textContent = "🔎 Searching…";
    extra.textContent = "";

    try {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1`
      ).then((r) => r.json());

      if (!g.results?.length) return (status.textContent = "City not found.");

      const { latitude, longitude, name, country, timezone } = g.results[0];
      tz = timezone || tz;
      cityName.textContent = `${name}, ${country}`;
      status.textContent = "🌐 City data loaded.";
      loadSun(latitude, longitude);
    } catch {
      status.textContent = "⚠️ Error looking up city.";
    }
  });
});
