export default function handler(req, res) {
  const uptime = process.uptime ? Math.floor(process.uptime()) : 0;
  const memory = process.memoryUsage ? process.memoryUsage() : {};

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  return res.status(200).json({
    status: 'ok',
    service: 'guess-the-frame-edge',
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptime,
    region: process.env.VERCEL_REGION || 'local',
    environment: process.env.NODE_ENV || 'production',
    brokers: [
      { name: 'EMQX Cloud Broker', url: 'wss://broker.emqx.io:8084/mqtt', status: 'primary' },
      { name: 'HiveMQ Cloud / WebSockets', url: 'wss://broker.hivemq.com:8884/mqtt', status: 'fallback_1' },
      { name: 'Eclipse Mosquitto', url: 'wss://test.mosquitto.org:8081/mqtt', status: 'fallback_2' }
    ],
    memory: {
      rssMb: memory.rss ? Math.round(memory.rss / 1024 / 1024) : 0,
      heapUsedMb: memory.heapUsed ? Math.round(memory.heapUsed / 1024 / 1024) : 0
    }
  });
}
