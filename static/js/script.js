document.addEventListener('DOMContentLoaded', () => {
    // Set default date (today)
    const today = new Date();
    document.getElementById('start-date').value = formatDate(today);
    
    // Form submission event listener
    const form = document.getElementById('forecast-form');
    form.addEventListener('submit', fetchForecast);
});

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchForecast(event) {
    event.preventDefault();
    
    // Get form values
    const city = document.getElementById('city').value;
    const startDate = document.getElementById('start-date').value;
    
    // Show loading, hide results and error
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    
    try {
        // Call the API (now only passing start_date)
        const response = await fetch(`/forecast?city=${encodeURIComponent(city)}&start_date=${startDate}`);
        const data = await response.json();
        
        // Hide loading
        document.getElementById('loading').classList.add('hidden');
        
        // Handle error response
        if (data.error) {
            showError(data.error);
            return;
        }
        
        // Display results
        displayResults(city, data);
    } catch (error) {
        document.getElementById('loading').classList.add('hidden');
        showError('Error al obtener los datos históricos. Por favor, intenta de nuevo.');
        console.error('Error:', error);
    }
}

function showError(message) {
    const errorSection = document.getElementById('error-message');
    errorSection.classList.remove('hidden');
    errorSection.querySelector('.error').textContent = message;
}

function displayResults(city, forecast) {
    // Update city name
    document.getElementById('city-name').textContent = city;
    
    // Clear previous results
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = '';
    
    // If no results
    if (forecast.length === 0) {
        forecastContainer.innerHTML = '<p>No se encontraron datos históricos para este período.</p>';
    } else {
        // Create a column for each day
        forecast.forEach(day => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            
            // Format date (from YYYY-MM-DD to DD/MM/YYYY)
            const dateParts = day.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            
            // Day header
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = formattedDate;
            dayColumn.appendChild(dayHeader);
            
            // Create a card for each historical year
            day.historical_data.forEach(yearData => {
                const card = document.createElement('div');
                card.className = 'history-card';
                
                card.innerHTML = `
                    <div class="year">${yearData.year}</div>
                    <div class="temps">
                        <span class="temp-max">${yearData.temp_max.toFixed(1)}°</span>
                        <span class="temp-sep">/</span>
                        <span class="temp-min">${yearData.temp_min.toFixed(1)}°</span>
                    </div>
                    <div class="weather-category ${getWeatherClass(yearData.weather_category)}">
                        ${yearData.weather_category}
                    </div>
                `;
                
                dayColumn.appendChild(card);
            });
            
            forecastContainer.appendChild(dayColumn);
        });
    }
    
    // Show results section
    document.getElementById('results').classList.remove('hidden');
}

function getWeatherClass(category) {
    const classMap = {
        'Soleado': 'sunny',
        'Parcialmente nublado': 'partly-cloudy',
        'Nublado': 'cloudy',
        'Niebla': 'foggy',
        'Llovizna': 'drizzle',
        'Lluvia': 'rainy',
        'Nieve': 'snowy',
        'Tormenta': 'stormy',
        'Desconocido': 'unknown'
    };
    
    return classMap[category] || 'unknown';
} 