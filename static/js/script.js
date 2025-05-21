document.addEventListener('DOMContentLoaded', () => {
    // Set default dates (today and 7 days from now)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    document.getElementById('start-date').value = formatDate(today);
    document.getElementById('end-date').value = formatDate(nextWeek);
    
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
    const endDate = document.getElementById('end-date').value;
    
    // Show loading, hide results and error
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    
    try {
        // Call the API
        const response = await fetch(`/forecast?city=${encodeURIComponent(city)}&start_date=${startDate}&end_date=${endDate}`);
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
        showError('Error al obtener el pronóstico. Por favor, intenta de nuevo.');
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
        // Create a card for each forecast day
        forecast.forEach(day => {
            const card = document.createElement('div');
            card.className = 'forecast-card';
            
            // Format date (from YYYY-MM-DD to DD/MM/YYYY)
            const dateParts = day.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            
            card.innerHTML = `
                <div class="forecast-date">${formattedDate}</div>
                <div class="forecast-temp">${day.expected_avg_temp_c}°C</div>
                <div class="forecast-condition">${day.expected_condition_text}</div>
            `;
            
            forecastContainer.appendChild(card);
        });
    }
    
    // Show results section
    document.getElementById('results').classList.remove('hidden');
} 