/*
Project: Weather Dashboard
Developer: Joshua Allgood
File: script.js

Description: Handles city searches, retrieves live weather information, and updates the dashboard.

Technologies: JavaScript, Open-Meteo API

File Responsibilities:
    - Handle city search submissions.
    - Retrieve location coordinates.
    - Fetch current weather information dynamically.
    - Update weather information dynamically.
    - Handle API errors and invalid searches.
*/

/* 1. DOM ELEMENT REFERENCES -- Connects JavaScript to HTML elements. */

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");

// Location selection elements.
const locationResults = document.getElementById("location-results");
const locationSelect = document.getElementById("location-select");

// Displays search errors and helpful messages.
const searchMessage = document.getElementById("search-message");

// Refresh button for updating the selected city's weather
const refreshButton = document.getElementById("refresh-weather");

// Stores the matching locations returned by the geocoding API.
let matchingLocations = [];

// Store the current displayed location for weather refreshes.
let currentLocation = null;

const cityName = document.getElementById("city-name");
const weatherDate = document.getElementById("weather-date");

const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");

const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");

/* 2. CITY SEARCH EVENT LISTENER -- Handles form submissions and captures the city entered by the user. */

searchForm.addEventListener("submit", function(event) {

    // Prevent the browser from refreshing the page.
    event.preventDefault();

    // Retrieve the city entered by the user.
    const city = cityInput.value.trim();

    // Verify that the city name is not empty.
    if (city === "") {
        return;
    }

    // Retrieve matching locations for the entered city.
    getCityCoordinates(city);
});

/* 3. CITY GEOCODING -- Converts a city name into geographic coordinates using the Open-Meteo API. */

async function getCityCoordinates(city) {

    // Inform the user that the city search is in progress.
    searchMessage.classList.remove("error");
    searchMessage.textContent="Searching for matching locations...";
    searchMessage.hidden = false;

    // Hide previous location results while starting a new search.
    locationResults.hidden = true;

    // Clear previously stored matching locations.
    matchingLocations = [];

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to retrieve city information.");
        }

        const data = await response.json();

        // Check wether the API returned any matching locations.
        if (!data.results || data.results.length === 0) {

            // Display a helpful message to the user.
            searchMessage.classList.add("error");
            searchMessage.textContent = "City not found. Please try another location.";

            // Make the message visible.
            searchMessage.hidden = false;

            // stop the function.
            return;
        }

        // Store the matching locations for later selection.
        matchingLocations = data.results;

        // Automatically retrieve weather when only one location matches.
        if (matchingLocations.length === 1) {

            // Hide the location selector. 
            locationResults.hidden = true;

            // Retrieve the only matchin location.
            const location = matchingLocations[0];

            // Display weather for the matching locations.
            await getCurrentWeather(
                location.latitude,
                location.longitude,
                location
            );

            return;
        }
        
        // Clear any previous location options.
        locationSelect.replaceChildren();

        // Create the default dropdown option.
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Choose a city and state";
        locationSelect.appendChild(defaultOption);

        // Create an option for each matching city. 
        data.results.forEach((location, index) => {

            const option = document.createElement("option");

            option.value = index;

            option.textContent = [
                location.name, 
                location.admin1,
                location.country
            ].filter(Boolean).join(", ");

            locationSelect.appendChild(option);
        });

        // Clear the loading message after matching locations are found.
        searchMessage.textContent = "";
        searchMessage.hidden = true;

        // Display the location selector.
        locationResults.hidden = false;

    } catch (error) {

        //  Log the technical error for debugging.
        console.error("Geocoding error:", error.message);

        // Display a helpful message to the user.
        searchMessage.classList.add("error");
        searchMessage.textContent = "Unable to connect to the weather service. Please try again.";

        // Make the message visible.
        searchMessage.hidden = false;
    }
}

/* 3A. LOCATION SELECTION -- Retrieves weather for the locaiton selected by the user. */

locationSelect.addEventListener("change", async function() {

    // Clear any previous search or weather error messages.
    searchMessage.textContent = "";
    searchMessage.hidden = true;

    // Retrieve the selected location's index.
    const selectedIndex = locationSelect.value;
    
    // Ignore the default placeholder option.
    if (selectedIndex === "") {
        return;
    }

    // Find the selected location in the stored results.
    const location = matchingLocations[Number(selectedIndex)];

    if (!location) {
        return;
    }

    // Retrieve weather for the selected location.
    await getCurrentWeather(
        location.latitude,
        location.longitude,
        location
    );
});

/* 3B. REFRESH WEATHER -- Updates weather for the selected city. */

refreshButton.addEventListener("click", async function() {

    // Make sure a city has already been loaded.
    if (!currentLocation) {
        return;
    }

    // Prevent repeated clicks while refreshing.
    refreshButton.disabled = true;

    try {

    // Retrieve updated weather using the saved corrdinates.
    await getCurrentWeather(
        currentLocation.latitude,
        currentLocation.longitude,
        currentLocation
    );
} finally {

    // Always re-enable the button when the request finishes.
    refreshButton.disabled = false;
}
    
}); 

/* 4. CURRENT WEATHER API --  Retrieves current weather conditions using geographic coordinates. */

async function getCurrentWeather(latitude, longitude, location) {

    // Inform the user that weather information is loading.
    searchMessage.classList.remove("error");
    searchMessage.textContent = "Loading weather information...";
    searchMessage.hidden = false;

    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to retrieve weather information.");
        }

        const data = await response.json();
   
        displayCurrentWeather(data.current, location);
        displayHourlyForecast(data.hourly, data.current.time, data.daily);
        displayDailyForecast(data.daily);

        // Save the successfully loaded location for future refreshes.
        currentLocation = location;

        // Enable the refresh button now that weather data is available.
        if (currentLocation) {
            refreshButton.disabled = false;
        }

        // Clear the loading message after weather information is displayed.
        searchMessage.textContent = "";
        searchMessage.hidden = true;

    } catch (error) {

        // Log the technical error for debugging.
        console.error("Weather API error:", error.message);

        // Inform the user that weather information could not be retrieved.
        searchMessage.classList.add("error");
        searchMessage.textContent = "Unable to retrieve weather information. Please try again.";

        // Display the error message. 
        searchMessage.hidden = false;
    }
}

/* 5. DISPLAY CURRENT WEATHER -- Update the dashboard with live weather information retrieved from Open-Meteo. */

function displayCurrentWeather(weather, location) {

    // Display the selected city.
    cityName.textContent = [location.name, location.admin1 || location.country].filter(Boolean).join(", ");

    // Display the local date and time for the selected city.
    weatherDate.textContent = formatWeatherDate(weather.time);

    // Display the current temperature.
    temperature.textContent =  `${Math.round(weather.temperature_2m)}°F`;

    // Display a readable weather description.
    weatherDescription.textContent = getWeatherDescription(weather.weather_code);

    // Display the feels-like temperature.
    feelsLike.textContent = `${Math.round(weather.apparent_temperature)}°F`;

    // Display the humidity percentage.
    humidity.textContent = `${weather.relative_humidity_2m}%`;

    // Display the wind speed.
    windSpeed.textContent = `${Math.round(weather.wind_speed_10m)} mph`;
}

/* 6. WEATHER CODE DESCRIPTIONS -- Converts Open-Meteo weather codes into readable weather conditions. */

function getWeatherDescription(code) {

    const descriptions = {
        0: "Clear Sky",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing Rime Fog",
        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Dense Drizzle",
        56: "Light Freezing Drizzle",
        57: "Dense Freezing Drizzle",
        61: "Light Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        66: "Light Freezing Rain",
        67: "Heavy Freezing Rain",
        71: "Light Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",
        77: "Snow Grains",
        80: "Light Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",
        85: "Light Snow Showers",
        86: "Heavy Snow Showers",
        95: "Thunderstorm",
        96: "Thunderstorm with Slight Hail",
        99: "Thunderstorm with Heavy Hail"
    };

    return descriptions[code] ?? "Weather conditions unavailable";
}

/* 7. DATE AND TIME FORMATTING -- Converts the API's local date and time into a readable format. */

function formatWeatherDate(dateString) {

    // Extract the date and time from the API.
    const [datePart, timePart] = dateString.split("T");

    // Separate the year, month, and day.
    const [year, month, day] = datePart.split("-").map(Number);

    // Separate the hour and minute.
    const [hour, minute] = timePart.split(":").map(Number);

    // Create a date using the supplied local components.
    const date = new Date(year, month -1, day, hour, minute);

    // Format the date for display.
    const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    // Format the time for display.
    const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });

    return `${formattedDate} at ${formattedTime}`;
}

/* 8 DISPLAY HOURLY FORECAST -- Creates forecast cards for the next 12 hours using Open-Meteo API data. */

function displayHourlyForecast(hourly, currentTime, daily) {

    const container = document.getElementById("hourly-container");

    // Remove the placeholder or previous forecast.
    container.replaceChildren();

    // Find the first forecast hour at or after the current observation.
    const startIndex = hourly.time.findIndex(time => time >= currentTime.slice(0, 13));

    if (startIndex === -1) {
        container.textContent = "Hourly forecast unavailable.";
        return;
    }

    // Display up to 12 hourly forecast cards.
    const endIndex = Math.min(startIndex + 12, hourly.time.length);

    for (let i = startIndex; i < endIndex; i++) {

        const card = document.createElement("div");
        card.className = "hourly-card";

        const time = document.createElement("p");
        time.className = "hourly-time";

        const hour = Number(hourly.time[i].slice(11, 13));
        time.textContent = `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;

        // Determine whether the forecast hour occurs during daylight.
        const forecastTime = hourly.time[i];

        // Extract the date from the forecast hour.
        const forecastDate = forecastTime.slice(0, 10);

        // Find the matching date in the daily forecast.
        const dayIndex = daily.time.indexOf(forecastDate);

        // Compare the forecast time against sunrise and sunset.
        const isDaytime = dayIndex !== -1 && forecastTime >= daily.sunrise[dayIndex] && forecastTime < daily.sunset[dayIndex];

        const icon = document.createElement("span");
        icon.className = "hourly-icon";
        // Display the appropriate daytime or nighttime weather icon.
        icon.textContent = getWeatherIcon(hourly.weather_code[i], isDaytime);

        const hourlyTemperature = document.createElement("p");
        hourlyTemperature.className = "hourly-temperature";
        hourlyTemperature.textContent = `${Math.round(hourly.temperature_2m[i])}°F`;

        const rain = document.createElement("p");
        rain.className = "hourly-rain";
        rain.textContent = `Rain: ${hourly.precipitation_probability[i]}%`;

        card.append(time, icon, hourlyTemperature, rain);
        container.appendChild(card);
    }
}

/* 9. WEATHER ICONS -- Converts Open-Meteo weather codes into visual weather icons. */

function getWeatherIcon(code, isDaytime = true) {

    // Display a sun during the day and a moon at night.
    if (code === 0) {
        return isDaytime ? "☀️" : "🌙";
    }

    // Display different icons for partly cloudy conditions.
    if (code === 1 || code === 2) {
        return isDaytime ? "🌤️" : "☁️";
    }

    if (code === 3) {
        return "☁️";
    }

    if (code === 45 || code === 48) {
        return "🌫️";
    }

    if (code >= 51 && code <= 67) {
        return "🌧️";
    }

    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
        return "❄️";
    }

    if (code >= 80 && code <= 82) {
        return "🌦️";
    }

    if (code >= 95 && code <= 99) {
        return "⛈️";
    }

    return "🌡️";
}

/* 10. DISPLAY DAILY FORECAST -- Creates forecast cards for the next seven days using Open-Mateo API data. */

function displayDailyForecast(daily) {

    const container = document.getElementById("daily-container");

    // Remove the placeholder or previous forecast.
    container.replaceChildren();

    // Display up to seven daily forecast cards.
    const endIndex = Math.min(7, daily.time.length);

    for (let i = 0; i < endIndex; i++) {

        // Create the individual forecast card.
        const card = document.createElement("div");
        card.className = "daily-card";

        // Create the day label.
        const day = document.createElement("p");
        day.className = "daily-day";

        // Convert the API date into a readable weekday.
        const [year, month, date] = daily.time[i].split("-").map(Number);
        const forecastDate = new Date(year, month - 1, date);

        day.textContent = forecastDate.toLocaleDateString("en-US", {
            weekday: "short"
        });

        // Create the weather icon. 
        const icon = document.createElement("span");
        icon.className = "daily-icon";
        icon.textContent = getWeatherIcon(daily.weather_code[i]);

        // Create the daily high temperature.
        const high = document.createElement("p");
        high.className = "daily-high";
        high.textContent = `${Math.round(daily.temperature_2m_max[i])}°F`;

        // Create the daily low temperature.
        const low = document.createElement("p");
        low.className = "daily-low";
        low.textContent = `${Math.round(daily.temperature_2m_min[i])}°F`;

        // Create the precipitation probability.
        const rain = document.createElement("p");
        rain.className = "daily-rain";
        rain.textContent = `Rain: ${daily.precipitation_probability_max[i]}%`;

        // Add the weather information to the card
        card.append(day, icon, high, low, rain);

        // Add the completed card to the forecast container.
        container.appendChild(card);
    }
}
