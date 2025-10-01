import { json } from "@remix-run/node"
import { log } from "../utils/logger"
import { createAdminApiClient } from "@shopify/admin-api-client"
import { sessionStorage } from "../shopify.server"
import { fulfillOrder } from "../utils/shopifyOrder"

export async function action({ request, params }) {
  try {
    const orderId = params.id
    const body = await request.json()

    // Check header Authorization Bearer token
    const authHeader = request.headers.get("Authorization") || ""
    const token = authHeader.replace("Bearer ", "").trim()

    if (token !== process.env.API_TOKEN) {
      log("Invalid token in fulfill API", "ERROR")
      return json(
        {
          success: false,
          message: "Invalid token",
        },
        { status: 401 },
      )
    }

    // Get store from header
    const shop = request.headers.get("Store") || ""
    if (!shop) {
      log("No store header in fulfill API", "ERROR")
      return json(
        {
          success: false,
          message: "No store header",
        },
        { status: 400 },
      )
    }

    log(`Fulfilling order ${orderId} for store ${shop}`, "INFO")
    const session = await sessionStorage.findSessionsByShop(shop + ".myshopify.com")

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
    
    // Create Shopify Admin client
    const client = createAdminApiClient({
      storeDomain: shop + ".myshopify.com",
      apiVersion: process.env.SHOPIFY_API_VERSION,
      accessToken: session[0].accessToken,
    })

    // Fulfill the order
    const response = await fulfillOrder(
      client,
      orderId,
      body.notifyCustomer,
      body.trackingInfo || {},
    )

    if (response.errors) {
      log(
        `Error fulfilling order ${orderId}: ${JSON.stringify(response.errors)}`,
        "ERROR",
      )
      return json(
        {
          success: false,
          message: "Error fulfilling order",
          errors: response.errors,
        },
        { status: 500 },
      )
    }

    // Return success response
    return json(
      {
        success: true,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in fulfill API:", error)
    return json(
      {
        success: false,
        message: "Internal server error",
        error: error.message || "Unknown error",
      },
      { status: 500 }, 
    )
  }
}