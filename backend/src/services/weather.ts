import { logger } from './logger.js';

interface WeatherData {
  windSpeedKnots: number;
  windDirection: number;
  waveHeightMeters?: number;
  temperature?: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, { data: WeatherData; timestamp: number }>();

export class WeatherService {
  private static instance: WeatherService;
  
  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  // Round coordinates to increase cache hit rate (e.g. 0.1 degree is ~11km)
  private getCacheKey(lat: number, lon: number): string {
    return `${lat.toFixed(1)},${lon.toFixed(1)}`;
  }

  public async getWeather(lat: number, lon: number): Promise<WeatherData | null> {
    const key = this.getCacheKey(lat, lon);
    const cached = cache.get(key);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      // Fetch Wind from standard API
      // windspeed_unit=kn to get knots directly
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kn`;
      
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error(`Weather API error: ${weatherRes.statusText}`);
      const weatherJson = await weatherRes.json() as any;
      
      const current = weatherJson.current;
      
      // Try Fetch Waves from Marine API (might fail if on land, though usually returns nulls)
      let waveHeight = undefined;
      try {
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height`;
        const marineRes = await fetch(marineUrl);
        if (marineRes.ok) {
           const marineJson = await marineRes.json() as any;
           if (marineJson.current && marineJson.current.wave_height !== null) {
             waveHeight = marineJson.current.wave_height;
           }
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to fetch marine data');
      }

      const data: WeatherData = {
        windSpeedKnots: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        temperature: current.temperature_2m,
        waveHeightMeters: waveHeight
      };

      cache.set(key, { data, timestamp: Date.now() });
      return data;

    } catch (error) {
      logger.error({ error }, 'Error fetching weather data');
      return null;
    }
  }
}
