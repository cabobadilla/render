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
        document.getElementById('results').classList.remove('hidden');
        return;
    }
    
    // Add scroll indicator for mobile
    if (window.innerWidth <= 768) {
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.textContent = 'Desliza horizontalmente para ver más datos';
        forecastContainer.appendChild(scrollIndicator);
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'weather-table';
    
    // Add header row with dates
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    emptyHeader.textContent = 'Año';
    headerRow.appendChild(emptyHeader);
    
    // Add date headers
    forecast.forEach(day => {
        const dateParts = day.date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
        const th = document.createElement('th');
        th.textContent = formattedDate;
        headerRow.appendChild(th);
    });
    
    const thead = document.createElement('thead');
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Get all unique years from the data
    const allYears = new Set();
    forecast.forEach(day => {
        day.historical_data.forEach(yearData => {
            allYears.add(yearData.year);
        });
    });
    
    // Sort years in descending order
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);
    
    // Create a row for each year
    sortedYears.forEach(year => {
        const row = document.createElement('tr');
        
        // Add year cell
        const yearCell = document.createElement('td');
        yearCell.textContent = year;
        yearCell.className = 'year-cell';
        row.appendChild(yearCell);
        
        // Add data for each day
        forecast.forEach(day => {
            const cell = document.createElement('td');
            
            // Find the data for this year and day
            const yearData = day.historical_data.find(data => data.year === year);
            
            if (yearData) {
                cell.innerHTML = `
                    <div class="temp-container">
                        <span class="temp-max">${yearData.temp_max.toFixed(1)}°</span>
                        <span class="temp-sep">/</span>
                        <span class="temp-min">${yearData.temp_min.toFixed(1)}°</span>
                    </div>
                    <div class="weather-icon ${getWeatherIconClass(yearData.weather_category)}" 
                         title="${yearData.weather_category}"></div>
                `;
            } else {
                cell.textContent = 'N/A';
                cell.className = 'no-data';
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    forecastContainer.appendChild(table);
    
    // Show results section
    document.getElementById('results').classList.remove('hidden');
    
    // Add scroll detection for indicator
    if (window.innerWidth <= 768) {
        const tableContainer = document.getElementById('forecast-container');
        tableContainer.addEventListener('scroll', function() {
            const scrollIndicator = tableContainer.querySelector('.scroll-indicator');
            if (this.scrollLeft > 10) {
                scrollIndicator.style.opacity = '0';
            } else {
                scrollIndicator.style.opacity = '1';
            }
        });
    }
}

function getWeatherIconClass(category) {
    const iconMap = {
        'Soleado': 'icon-sunny',
        'Parcialmente nublado': 'icon-partly-cloudy',
        'Nublado': 'icon-cloudy',
        'Niebla': 'icon-foggy',
        'Llovizna': 'icon-drizzle',
        'Lluvia': 'icon-rainy',
        'Nieve': 'icon-snowy',
        'Tormenta': 'icon-stormy',
        'Desconocido': 'icon-unknown'
    };
    
    return iconMap[category] || 'icon-unknown';
} 