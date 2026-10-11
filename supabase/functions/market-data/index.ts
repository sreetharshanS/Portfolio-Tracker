import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'get_ohlc' | 'ping' | 'get_provider_status'
  symbol?: string
  exchange?: 'NSE' | 'BSE'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('MARKET_DATA_API_KEY')
    const provider = Deno.env.get('MARKET_DATA_PROVIDER') || 'AlphaVantage' // e.g. AlphaVantage, TwelveData, EODHD

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          configured: false,
          provider,
          message:
            'Market data API credentials are not configured on the server. Please set the MARKET_DATA_API_KEY secret in your Supabase project.',
          setupGuide: {
            step1: 'Sign up with a market data provider supporting Indian stocks (e.g. Twelve Data, Alpha Vantage, or EODHD).',
            step2: 'Add MARKET_DATA_API_KEY to Supabase Secrets using `supabase secrets set MARKET_DATA_API_KEY=your_key`.',
            step3: 'Optionally set MARKET_DATA_PROVIDER (defaults to AlphaVantage).',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const { action, symbol = 'RELIANCE', exchange = 'NSE' }: RequestBody = await req.json()

    if (action === 'get_provider_status') {
      return new Response(
        JSON.stringify({
          configured: true,
          provider,
          status: 'ready',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (action === 'get_ohlc') {
      // Clean symbol for Indian exchange
      const querySymbol = exchange === 'BSE' ? `${symbol}.BSE` : `${symbol}.BSE` // or .NSE depending on provider

      // Example fetch using provider with server-side API key:
      let url = ''
      if (provider === 'TwelveData') {
        url = `https://api.twelvedata.com/time_series?symbol=${symbol}&exchange=${exchange}&interval=1day&outputsize=260&apikey=${apiKey}`
      } else {
        url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${querySymbol}&outputsize=full&apikey=${apiKey}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Data provider returned status ${response.status}`)
      }

      const rawData = await response.json()

      return new Response(
        JSON.stringify({
          configured: true,
          provider,
          symbol,
          exchange,
          priceType: 'End-of-Day',
          timestamp: new Date().toISOString(),
          data: rawData,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 5-minute cache
          },
          status: 200,
        },
      )
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error'
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
