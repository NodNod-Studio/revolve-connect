import { json } from "@remix-run/node"
import { log } from "../utils/logger"
import { createAdminApiClient } from "@shopify/admin-api-client"
import { cancelOrder } from "../utils/shopifyOrder"
import { checkToken } from "../utils/auth"
import { getSession } from "../utils/session"

export async function action({ request, params }) {
  try {
    const orderId = params.id
    const body = await request.json()

    if (!checkToken(request)) {
      log("Invalid token in cancel API", "ERROR")
      return json(
        {
          success: false,
          message: "Invalid token",
        },
        { status: 401 },
      )
    }

    const { store, accessToken } = await getSession(request)
    if (!store || !accessToken) {
      return json(
        {
          success: false,
          message: "No store header or session found",
        },
        { status: 400 },
      )
    }

    // Create Shopify Admin client
    const client = createAdminApiClient({
      storeDomain: store,
      apiVersion: process.env.SHOPIFY_API_VERSION,
      accessToken: accessToken,
    })

    // cancel the order
    const response = await cancelOrder(
      client,
      orderId,
      body.reason || "OTHER",
      body.restockItems || false,
      body.lineItems || [],
      body.notifyCustomer || true,
    )

    if (response.errors) {
      log(
        `Error canceling order ${orderId}: ${JSON.stringify(response.errors)}`,
        "ERROR",
      )
      return json(
        {
          success: false,
          message: "Error canceling order",
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
    console.error("Error in cancel API:", error)
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