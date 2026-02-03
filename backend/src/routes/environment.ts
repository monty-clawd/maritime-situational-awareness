import { Router } from 'express';
import { WeatherService } from '../services/weather.js';

const router = Router();
const weatherService = WeatherService.getInstance();

router.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: 'Missing or invalid lat/lon parameters' });
      return;
    }

    const data = await weatherService.getWeather(lat, lon);
    
    if (!data) {
      res.status(503).json({ error: 'Weather service unavailable' });
      return;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
