import { json } from "@remix-run/node"

// Handle GET requests
export async function loader({ request, params }) {
  const orderId = params.id
  const url = new URL(request.url)

  console.log("=== ORDER RETURN API (GET) ===")
  console.log("Order ID:", orderId)
  console.log("Method:", request.method)
  console.log("URL:", request.url)
  console.log("Headers:", Object.fromEntries(request.headers.entries()))
  console.log("Search Params:", Object.fromEntries(url.searchParams.entries()))
  console.log("Timestamp:", new Date().toISOString())
  console.log("===============================")

  return json(
    {
      success: true,
    },
    { status: 200 },
  )
}

// Handle POST, PUT, DELETE requests
export async function action({ request, params }) {
  try {
    const orderId = params.id
    const url = new URL(request.url)

    // Get request body if present
    let body = null
    try {
      const contentType = request.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        body = await request.json()
      } else if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData()
        body = Object.fromEntries(formData.entries())
      } else {
        body = await request.text()
      }
    } catch {
      // No body or invalid format
    }

    // Get headers
    const headers = Object.fromEntries(request.headers.entries())

    // Get search params
    const searchParams = Object.fromEntries(url.searchParams.entries())

    // Log all the data
    console.log("=== ORDER RETURN API CALLED ===")
    console.log("Order ID:", orderId)
    console.log("Method:", request.method)
    console.log("URL:", request.url)
    console.log("Headers:", headers)
    console.log("Search Params:", searchParams)
    console.log("Body:", body)
    console.log("Timestamp:", new Date().toISOString())
    console.log("=================================")


    
    // Return success response
    return json(
      {
        success: true,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in return API:", error)
    return json(
      {
        success: false,
        message: "Internal server error",
        error: error.message || "Unknown error",
      },
      { status: 200 }, // Still return 200 as requested
    )
  }
}