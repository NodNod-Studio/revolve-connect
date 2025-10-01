import { sessionStorage } from "../shopify.server"

export async function getSession(request) {
    // Get store from header
    const shop = request.headers.get("Store") || ""
    if (!shop) {
      log("No store header API", "ERROR")
      return json(
        {
          success: false,
          message: "No store header",
        },
        { status: 400 },
      )
    }

    const store = (shop.endsWith(".myshopify.com")) ? shop : shop + ".myshopify.com"

    const session = await sessionStorage.findSessionsByShop(store)

    if (session.length === 0) {
      log(`No session found for store ${shop}`, "ERROR")
      return json(
        {
          success: false,
          message: "No session found for store",
        },
        { status: 400 },
      )
    }

    return {
        store,
        accessToken: session[0].accessToken,
    }
}