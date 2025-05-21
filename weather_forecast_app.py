# weather_forecast_app.py (adaptado para entorno sin ssl y Nominatim con User-Agent)

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Dict
import statistics
from datetime import datetime, timedelta
import os

try:
    import requests
except ImportError:
    raise ImportError("El módulo 'requests' no está instalado. Instálalo con 'pip install requests'")

app = FastAPI()

# Configurar archivos estáticos y templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

GEOCODING_URL = "http://nominatim.openstreetmap.org/search"
WEATHER_URL = "http://archive-api.open-meteo.com/v1/archive"
HEADERS = {"User-Agent": "weather-app/1.0 (cbobadilla.dsoft@gmail.com)"}  # requerido por Nominatim

WEATHER_CODE_MAP = {
    0: "Despejado",
    1: "Principalmente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    66: "Lluvia helada ligera",
    67: "Lluvia helada fuerte",
    71: "Nieve ligera",
    73: "Nieve moderada",
    75: "Nieve intensa",
    77: "Cristales de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos fuertes",
    85: "Nieve dispersa ligera",
    86: "Nieve dispersa fuerte",
    95: "Tormenta",
    96: "Tormenta con granizo ligero",
    99: "Tormenta con granizo fuerte"
}

# Categorías de clima simplificadas
WEATHER_CATEGORIES = {
    "Soleado": [0, 1],
    "Parcialmente nublado": [2],
    "Nublado": [3],
    "Niebla": [45, 48],
    "Llovizna": [51, 53, 55, 56, 57],
    "Lluvia": [61, 63, 65, 66, 67, 80, 81, 82],
    "Nieve": [71, 73, 75, 77, 85, 86],
    "Tormenta": [95, 96, 99]
}

def get_weather_category(code):
    for category, codes in WEATHER_CATEGORIES.items():
        if code in codes:
            return category
    return "Desconocido"

@app.get("/", response_class=templates.TemplateResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/forecast")
def historical_forecast(city: str, start_date: str):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        # Calcular end_date automáticamente (start_date + 4 días = 5 días en total)
        end = start + timedelta(days=4)
        end_date = end.strftime("%Y-%m-%d")
    except ValueError:
        return {"error": "Fecha debe tener formato YYYY-MM-DD"}

    # Obtener lat/lon de la ciudad usando Nominatim (con header User-Agent obligatorio)
    try:
        geo_resp = requests.get(GEOCODING_URL, params={"q": city, "format": "json", "limit": 1}, headers=HEADERS)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
    except Exception:
        return {"error": f"No se pudo obtener la ubicación para la ciudad '{city}'"}

    if not geo_data:
        return {"error": f"Ciudad '{city}' no encontrada"}

    lat = float(geo_data[0]['lat'])
    lon = float(geo_data[0]['lon'])

    # Resultados para cada día del periodo
    final_result = []
    
    # Para cada día en el rango seleccionado
    for day_offset in range(5):  # 5 días en total
        target_date = start + timedelta(days=day_offset)
        target_date_str = target_date.strftime("%Y-%m-%d")
        
        # Histórico de los últimos 5 años para el mismo día
        historical_data = []
        
        # Consultar los últimos 5 años
        for year_offset in range(1, 6):
            historic_date = target_date.replace(year=target_date.year - year_offset)
            historic_date_str = historic_date.strftime("%Y-%m-%d")
            
            try:
                # Consultar solo ese día específico
                weather_resp = requests.get(WEATHER_URL, params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": historic_date_str,
                    "end_date": historic_date_str,
                    "daily": "temperature_2m_max,temperature_2m_min,weathercode",
                    "timezone": "auto"
                })
                weather_resp.raise_for_status()
                data = weather_resp.json()
                
                # Extraer datos diarios
                daily_data = data.get("daily", {})
                dates = daily_data.get("time", [])
                
                if dates and historic_date_str in dates:
                    idx = dates.index(historic_date_str)
                    temp_max = daily_data.get("temperature_2m_max", [])[idx]
                    temp_min = daily_data.get("temperature_2m_min", [])[idx]
                    weather_code = daily_data.get("weathercode", [])[idx]
                    
                    historical_data.append({
                        "year": historic_date.year,
                        "temp_max": temp_max,
                        "temp_min": temp_min,
                        "weather_code": weather_code,
                        "weather_text": WEATHER_CODE_MAP.get(weather_code, "Desconocido"),
                        "weather_category": get_weather_category(weather_code)
                    })
            except Exception as e:
                continue
        
        # Añadir el día con su histórico de 5 años
        if historical_data:
            final_result.append({
                "date": target_date_str,
                "historical_data": historical_data
            })
    
    return final_result

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("weather_forecast_app:app", host="0.0.0.0", port=port, reload=False)
