import { submitOrder } from "../services/submitOrder"
import { authenticate } from "../shopify.server"
import { log } from "../utils/logger"

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request)

  if (!admin) {
    log("Admin context unavailable", "ERROR")
    throw new Response("Admin context unavailable", { status: 403 })
  }


  switch (topic) {
    case "ORDERS_CREATED":
      log(`Order created webhook received for order ${payload.id}, payload: ${JSON.stringify(payload)}`)

      submitOrder(admin, payload).then((res) => {
        log(`Order submission response: ${JSON.stringify(res)}`)
      }).catch((error) => {
        log(`Error submitting order: ${error.message}`, "ERROR")
      })
      break

    default:
      log(`Unhandled webhook topic: ${topic}`, "WARN")
      throw new Response("Unhandled webhook topic", { status: 404 })
  }

  throw new Response()
}
