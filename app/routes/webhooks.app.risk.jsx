import { authenticate } from "../shopify.server"
import { log } from '../utils/logger'
import { paidOrder } from "../services/paidOrder"
import { cancelOrder } from "../utils/shopifyOrder"

export const action = async ({ request }) => {
  const { admin, payload } = await authenticate.webhook(request)

  if (!admin) {
    log("Admin context unavailable", "ERROR")
    throw new Response("Admin context unavailable", { status: 403 })
  }

  const { risk_level, order_id } = payload

  /**
   * No Risk
   */
  if (risk_level === "none") {
    log(`Risk handling ${order_id}, and payload: ${JSON.stringify(payload)}`)
    await paidOrder(admin, payload)
  }

  if (risk_level === "high") {
    log(`High risk handling ${order_id}, and payload: ${JSON.stringify(payload)}`)
    // The order is cancelled
    await cancelOrder(admin, order_id, "fraud", true, [], false)
  }

  throw new Response()
}
