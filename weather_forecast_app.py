# weather_forecast_app.py (adaptado para entorno sin ssl)

from fastapi import FastAPI
from typing import List
import statistics
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    raise ImportError("El módulo 'requests' no está instalado. Instálalo con 'pip install requests'")

app = FastAPI()

GEOCODING_URL = "http://nominatim.openstreetmap.org/search"
WEATHER_URL = "http://archive-api.open-meteo.com/v1/archive"

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

@app.get("/forecast")
def historical_forecast(city: str, start_date: str, end_date: str):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        return {"error": "Fechas deben tener formato YYYY-MM-DD"}

    if start > end:
        return {"error": "start_date debe ser anterior a end_date"}

    # Obtener lat/lon de la ciudad usando Nominatim (HTTP para evitar SSL)
    try:
        geo_resp = requests.get(GEOCODING_URL, params={"q": city, "format": "json", "limit": 1})
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
    except Exception:
        return {"error": f"No se pudo obtener la ubicación para la ciudad '{city}'"}

    if not geo_data:
        return {"error": f"Ciudad '{city}' no encontrada"}

    lat = float(geo_data[0]['lat'])
    lon = float(geo_data[0]['lon'])

    num_days = (end - start).days + 1
    result = []

    for year_offset in range(1, 6):
        historic_start = (start - timedelta(days=365 * year_offset)).strftime("%Y-%m-%d")
        historic_end = (end - timedelta(days=365 * year_offset)).strftime("%Y-%m-%d")

        try:
            weather_resp = requests.get(WEATHER_URL, params={
                "latitude": lat,
                "longitude": lon,
                "start_date": historic_start,
                "end_date": historic_end,
                "hourly": "temperature_2m,weathercode",
                "timezone": "auto"
            })
            weather_resp.raise_for_status()
            data = weather_resp.json()
        except Exception:
            continue

        timestamps = data.get("hourly", {}).get("time", [])
        temps = data.get("hourly", {}).get("temperature_2m", [])
        codes = data.get("hourly", {}).get("weathercode", [])

        if not timestamps or not temps:
            continue

        daily_data = {}
        for ts, temp, code in zip(timestamps, temps, codes):
            day = ts.split("T")[0]
            if day not in daily_data:
                daily_data[day] = {"temps": [], "codes": []}
            daily_data[day]["temps"].append(temp)
            daily_data[day]["codes"].append(code)

        for i in range(num_days):
            target_date = start + timedelta(days=i)
            comp_date = (target_date - timedelta(days=365 * year_offset)).strftime("%Y-%m-%d")
            if comp_date in daily_data:
                entry = daily_data[comp_date]
                result.append({
                    "date": target_date.strftime("%Y-%m-%d"),
                    "temp": statistics.mean(entry["temps"]),
                    "condition": max(set(entry["codes"]), key=entry["codes"].count)
                })

    aggregated = {}
    for item in result:
        key = item["date"]
        if key not in aggregated:
            aggregated[key] = {"temps": [], "codes": []}
        aggregated[key]["temps"].append(item["temp"])
        aggregated[key]["codes"].append(item["condition"])

    final_result = []
    for date in sorted(aggregated.keys()):
        temps = aggregated[date]["temps"]
        codes = aggregated[date]["codes"]
        most_common_code = max(set(codes), key=codes.count)
        final_result.append({
            "date": date,
            "expected_avg_temp_c": round(statistics.mean(temps), 1),
            "expected_condition_code": most_common_code,
            "expected_condition_text": WEATHER_CODE_MAP.get(most_common_code, "Desconocido")
        })

    return final_result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("weather_forecast_app:app", host="0.0.0.0", port=8000, reload=False)
