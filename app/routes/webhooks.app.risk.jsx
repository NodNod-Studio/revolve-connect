import { authenticate } from "../shopify.server"
import { log } from '../utils/logger'
import { paidOrder } from "../services/paidOrder"

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request)

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

  throw new Response()
}
