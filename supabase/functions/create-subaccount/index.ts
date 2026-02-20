import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FLW_SECRET_KEY = Deno.env.get('FLW_SECRET_KEY')

serve(async (req) => {
  try {
    const { account_bank, account_number, business_name, business_email } = await req.json()

    // 1. Call Flutterwave to create the subaccount
    const response = await fetch("https://api.flutterwave.com/v3/subaccounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FLW_SECRET_KEY}`
      },
      body: JSON.stringify({
        account_bank,
        account_number,
        business_name,
        business_email,
        business_contact: business_name,
        business_contact_mobile: "08000000000",
        country: "NG",
        split_type: "percentage",
        split_value: 0.15 // This is your 15% platform fee
      })
    })

    const result = await response.json()

    if (result.status !== "success") {
      throw new Error(result.message || "Flutterwave subaccount creation failed")
    }

    // 2. Return the subaccount_id to the app
    return new Response(
      JSON.stringify({ subaccount_id: result.data.subaccount_id }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    )
  }
})