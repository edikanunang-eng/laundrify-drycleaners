import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

serve(async (req) => {
  // 1. Check the Secret Hash first!
  const signature = req.headers.get("verif-hash");
  const secretHash = Deno.env.get("FLW_SECRET_HASH");

  if (!signature || signature !== secretHash) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    
    if (body.event === 'charge.completed' && body.data.status === 'successful') {
      const orderId = body.data.tx_ref; 
      
      const { error } = await supabaseClient
        .from('orders')
        .update({ 
          payment_status: 'paid',
          status: 'received' 
        })
        .eq('id', orderId);

      if (error) throw error;
      
      return new Response(JSON.stringify({ status: "success" }), { status: 200 });
    }

    return new Response("Event ignored", { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
})