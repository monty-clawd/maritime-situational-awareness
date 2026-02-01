from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass
class Anomaly:
    type: str
    severity: str
    details: dict[str, float | int | str]


class AnomalyDetector:
    """Placeholder integrity checks for AIS/GNSS discrepancies."""

    def detect(self, observations: Iterable[dict]) -> list[dict]:
        # Replace with real logic (distance checks, timing gaps, speed jumps)
        _ = observations
        return []
