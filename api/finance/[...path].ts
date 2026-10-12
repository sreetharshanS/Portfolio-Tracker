import type { IncomingMessage, ServerResponse } from 'node:http'

const API_PREFIX = '/api/finance'
const YAHOO_CHART_PATH = '/v8/finance/chart/'

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.statusCode = 405
    response.setHeader('Allow', 'GET')
    response.end('Method not allowed')
    return
  }

  const requestUrl = new URL(request.url ?? '/', 'https://vercel.invalid')
  const upstreamPath = requestUrl.pathname.slice(API_PREFIX.length)
  if (!upstreamPath.startsWith(YAHOO_CHART_PATH)) {
    response.statusCode = 404
    response.end('Not found')
    return
  }

  const upstreamUrl = new URL(
    `${upstreamPath}${requestUrl.search}`,
    'https://query1.finance.yahoo.com',
  )

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    response.statusCode = upstreamResponse.status
    response.setHeader(
      'Content-Type',
      upstreamResponse.headers.get('content-type') ?? 'application/json',
    )
    response.setHeader('Cache-Control', 'no-store')
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Market data provider request failed.'
    response.statusCode = 502
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: message }))
  }
}
