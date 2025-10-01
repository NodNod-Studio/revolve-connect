import { sessionStorage } from '../shopify.server'
import { log } from '../utils/logger'

export async function getSession(request) {
  // Get store from header
  const shop = request.headers.get('Store') || ''
  if (!shop) {
    log('No store header API', 'ERROR')
  }

  const store = (shop.endsWith('.myshopify.com')) ? shop : shop + '.myshopify.com'

  const session = await sessionStorage.findSessionsByShop(store)

  if (session.length === 0) {
    log(`No session found for store ${shop}`, 'ERROR')
  }

  return {
    store,
    accessToken: session[0].accessToken,
  }
}