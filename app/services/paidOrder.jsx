import fetch from 'node-fetch'
import redisClient from './redisClient'
import { log } from '../utils/logger'
import { getOrderMetafield } from '../utils/shopifyOrder'

/**
 * Submits an order paid to Revolve server API.
 * @param {Object} admin - The Shopify admin client.
 * @param {Object} orderPayload - The full order payload from Shopify.
 * @returns {Promise<{response: any}>}
 */
export async function paidOrder(admin, orderPayload) {
  const token = await redisClient.get('revolve_token')
  const userId = await redisClient.get('revolve_userId')

  if (!token || !userId) {
    throw new Error('Missing token or userId')
  }

  if (!orderPayload) {
    throw new Error('Missing order payload')
  }

  if (!orderPayload.financial_status || orderPayload.financial_status !== 'paid') {
    throw new Error('Order is not paid')
  }

  const payload = {
    subId: orderPayload.id,
    gateway: 'SHOPIFY',
    platform: 'SHOPIFY',
    type: orderPayload.payment_gateway_names ? orderPayload.payment_gateway_names[0] : '',
    paymentId: orderPayload.checkout_id,
    invoice: '',
  }

  // Set invoice
  const invoice = await getOrderMetafield(admin, orderPayload.id, 'invoice')
  if (invoice) {
    payload.invoice = invoice
  }

  try {
    const response = await fetch(process.env.REVOLVE_SERVER_URL + `/content/checkout/shopify/payment?token=${token}&userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json()

    if (!responseData.success) {
      log('Error paid order: ' + JSON.stringify(responseData), 'ERROR')
    }

    return { response: responseData }
  } catch (error) {
    log('Error paid order: ' + error, 'ERROR')
    throw error
  }
}
