import { Router } from 'express'
import { getZonesGeoJSON } from '../services/zones.js'

const router = Router()

router.get('/', (req, res) => {
  const geojson = getZonesGeoJSON()
  res.json(geojson)
})

export default router
