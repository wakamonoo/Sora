    document.addEventListener("DOMContentLoaded", () => {
      const status    = document.getElementById("status");
      const extra     = document.getElementById("extra");
      const cityInput = document.getElementById("city-input");
      const cityBtn   = document.getElementById("city-btn");
      const cityName  = document.getElementById("city-name");
      const sky       = document.getElementById("sky-bg");
      const sunScene  = document.getElementById("sunScene");
      const moonScene = document.getElementById("moonScene");

      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const fmt = (d,t)=>d.toLocaleTimeString("en-US",{timeZone:t});
      const fmtPH = d=>d.toLocaleTimeString("en-US",{timeZone:"Asia/Manila"});
      const fmtFull=(d,t)=>d.toLocaleString("en-US",{timeZone:t});

      function showScene(dayPhase){              // swap sky colours & scene visibility
        const map={
          night:"from-gray-900 to-black",
          dawn :"from-orange-200 to-yellow-300",
          day  :"from-sky-300   to-blue-500",
          dusk :"from-purple-600 to-pink-400"
        };
        sky.className=`absolute inset-0 bg-gradient-to-br ${map[dayPhase]} transition-colors duration-1000`;

        if(dayPhase==="night"){moonScene.classList.remove("hide"); sunScene.classList.add("hide");}
        else                  {sunScene.classList.remove("hide"); moonScene.classList.add("hide");}
      }

      function updatePhase(now,sunrise,sunset){
        if(now<sunrise){showScene("night");status.textContent="🌌 It's before sunrise.";}
        else if(now-sunrise<600000){showScene("dawn");status.textContent="🌄 The sun is rising.";}
        else if(now<sunset){showScene("day");status.textContent="🌞 It's daytime.";}
        else if(now-sunset<600000){showScene("dusk");status.textContent="🌇 The sun is setting.";}
        else{showScene("night");status.textContent="🌙 It's nighttime.";}
      }

      async function loadSun(lat,lng){
        try{
          const data=await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`).then(r=>r.json());
          const now=new Date(), sunrise=new Date(data.results.sunrise), sunset=new Date(data.results.sunset);
          updatePhase(now,sunrise,sunset);
          extra.innerHTML=
            `<div>Sunrise: ${fmt(sunrise,tz)} | Sunset: ${fmt(sunset,tz)}</div>
             <div class="mt-1">Current time there: ${fmtFull(now,tz)}</div>
             <div class="text-xs text-gray-400 mt-1">(PH Time — Sunrise: ${fmtPH(sunrise)}, Sunset: ${fmtPH(sunset)}, Current: ${fmtPH(now)})</div>`;
        }catch{status.textContent="⚠️ Error retrieving sun data.";}
      }

      function geoSuccess(pos){loadSun(pos.coords.latitude,pos.coords.longitude);}
      function geoError(){status.textContent="Please turn on your location";}

      navigator.geolocation?navigator.geolocation.getCurrentPosition(geoSuccess,geoError):
                             geoError();

      cityBtn.addEventListener("click",async()=>{
        const city=cityInput.value.trim();
        if(!city){status.textContent="Please enter a city name.";return;}
        status.textContent="🔎 Searching…"; extra.textContent="";
        try{
          const g=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r=>r.json());
          if(!g.results||!g.results.length){status.textContent="City not found.";return;}
          const {latitude,longitude,name,country,timezone}=g.results[0];
          tz=timezone||tz; cityName.textContent=`${name}, ${country}`; status.textContent="🌐 City data loaded.";
          loadSun(latitude,longitude);
        }catch{status.textContent="⚠️ Error looking up city.";}
      });
    });