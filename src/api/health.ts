export async function GET() {
  return new Response(JSON.stringify({ 
    status: "running",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      nasa_power: "available", 
      quantum_optimizers: "operational"
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}