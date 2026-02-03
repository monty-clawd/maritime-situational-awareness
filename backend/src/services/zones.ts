import { point, polygon } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import type { Feature, Polygon } from 'geojson'

export interface Zone {
  id: string
  name: string
  type: 'RESTRICTED' | 'WARNING' | 'WIND_FARM'
  geometry: Feature<Polygon>
}

// Sample Zones (German Bight / North Sea)
export const ZONES: Zone[] = [
  {
    id: 'zone-nordsee-ost',
    name: 'Nordsee Ost Wind Farm',
    type: 'WIND_FARM',
    geometry: polygon([
      [
        [7.65, 54.40],
        [7.75, 54.40],
        [7.75, 54.48],
        [7.65, 54.48],
        [7.65, 54.40],
      ],
    ]),
  },
  {
    id: 'zone-military-exclusion',
    name: 'Military Exclusion Zone A1',
    type: 'RESTRICTED',
    geometry: polygon([
      [
        [7.0, 54.0],
        [7.2, 54.0],
        [7.2, 54.2],
        [7.0, 54.2],
        [7.0, 54.0],
      ],
    ]),
  },
  {
      id: 'zone-heligoland-approach',
      name: 'Heligoland Approach',
      type: 'WARNING',
      geometry: polygon([
          [
              [7.8, 54.1],
              [8.0, 54.1],
              [8.0, 54.25],
              [7.8, 54.25],
              [7.8, 54.1]
          ]
      ])
  }
]

export const checkZones = (lat: number, lon: number): string | undefined => {
  const pt = point([lon, lat]) // Turf uses [lon, lat]

  for (const zone of ZONES) {
    if (booleanPointInPolygon(pt, zone.geometry)) {
      return zone.id
    }
  }

  return undefined
}

export const getZonesGeoJSON = () => {
  return {
    type: 'FeatureCollection',
    features: ZONES.map((z) => ({
      ...z.geometry,
      properties: {
        id: z.id,
        name: z.name,
        type: z.type,
      },
    })),
  }
}
