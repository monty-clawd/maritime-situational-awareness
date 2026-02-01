from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np


@dataclass
class SensorObservation:
    latitude: float
    longitude: float
    speed: float | None = None
    heading: float | None = None
    source: str = "AIS"


class KalmanFusionEngine:
    """Simple fusion placeholder; replace with FilterPy-based Kalman filter."""

    def fuse(self, observations: Iterable[SensorObservation]) -> dict[str, float] | None:
        observations_list = list(observations)
        if not observations_list:
            return None

        latitudes = np.array([obs.latitude for obs in observations_list])
        longitudes = np.array([obs.longitude for obs in observations_list])

        fused = {
            "latitude": float(latitudes.mean()),
            "longitude": float(longitudes.mean()),
            "confidence": 0.9,
        }
        return fused
