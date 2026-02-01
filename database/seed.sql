INSERT INTO vessels (mmsi, imo, name, flag, type, destination)
VALUES
  (366982330, 9241061, 'Pacific Sentinel', 'US', 'Container', 'Los Angeles'),
  (477123900, NULL, 'Aegean Crest', 'HK', 'Tanker', 'Long Beach')
ON CONFLICT DO NOTHING;

INSERT INTO data_sources (id, type, status, last_seen)
VALUES
  ('aisstream', 'AIS', 'ONLINE', NOW()),
  ('coastal_radar_01', 'RADAR', 'ONLINE', NOW())
ON CONFLICT DO NOTHING;
