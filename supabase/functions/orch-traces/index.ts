import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory storage for demo purposes
// In production, you'd want to use a proper database
const traces: any[] = [];
const messages: any[] = [];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      // Return recent traces and messages
      return new Response(JSON.stringify({
        traces: traces.slice(-100),
        messages: messages.slice(-100)
      }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.type === 'trace') {
        traces.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...body.data
        });
      } else if (body.type === 'message') {
        messages.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...body.data
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Error handling traces:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to handle traces',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});