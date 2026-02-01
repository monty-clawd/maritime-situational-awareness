import asyncio
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone

from dotenv import load_dotenv
from redis.asyncio import Redis

from anomaly_detector import AnomalyDetector
from kalman_fusion import KalmanFusionEngine

load_dotenv()


@dataclass
class FusionConfig:
    redis_url: str
    aisstream_key: str | None
    fusion_interval_s: float = 2.0


class FusionService:
    def __init__(self, config: FusionConfig) -> None:
        self.config = config
        self.redis = Redis.from_url(config.redis_url)
        self.fusion = KalmanFusionEngine()
        self.detector = AnomalyDetector()

    async def run(self) -> None:
        print("🚀 Fusion Engine Starting...")
        if self.config.aisstream_key:
            print("✅ AISStream API key loaded")

        try:
            while True:
                await self.run_cycle()
                await asyncio.sleep(self.config.fusion_interval_s)
        finally:
            await self.redis.close()

    async def run_cycle(self) -> None:
        # Placeholder for ingesting AIS/Radar data and running fusion
        now = datetime.now(timezone.utc).isoformat()
        fused_position = self.fusion.fuse([])
        anomalies = self.detector.detect([])

        if anomalies:
            payload = {"timestamp": now, "alerts": anomalies}
            await self.redis.publish("alerts", json.dumps(payload))

        await self.redis.publish(
            "fusion:heartbeat",
            json.dumps({"timestamp": now, "status": "ok", "fused": fused_position}),
        )


async def main() -> None:
    config = FusionConfig(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        aisstream_key=os.getenv("AISSTREAM_API_KEY"),
    )
    service = FusionService(config)
    await service.run()


if __name__ == "__main__":
    asyncio.run(main())
