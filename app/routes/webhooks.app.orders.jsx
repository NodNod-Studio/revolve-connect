import { authenticate } from "../shopify.server"
import { log } from '../utils/logger'

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request)

  if (!admin) {
    log("Admin context unavailable", "ERROR")
    throw new Response("Admin context unavailable", { status: 403 })
  }


  switch (topic) {
    case "ORDERS_CREATED":
      const { tags } = payload
      const TAGS = tags.toUpperCase()

      // /**
      //  * Auto return
      //  */
      // if (TAGS.includes(returnTag.toUpperCase()) && enableTagBasedOrderReturn) {
      //   log('[Enabled] Order auto return')
      //   await createAndCloseReturn(admin, payload)
      // }
      break

    default:
      log(`Unhandled webhook topic: ${topic}`, "WARN")
      throw new Response("Unhandled webhook topic", { status: 404 })
  }

  throw new Response()
}
