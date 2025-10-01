import { log } from './logger'

/**
 * Update Order Metafield.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} metafieldKey - The key of the metafield to update.
 * @param {string} metafieldValue - The value of the metafield to update.
 * @returns {Promise<Object>} - The API response.
 */
export async function saveOrderMetafield(admin, orderId, metafieldKey, metafieldValue) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId || !metafieldKey || !metafieldValue) {
    throw new Error('Missing parameters for saving order metafield')
  }

  const orderQuery = `
        mutation updateOrderMetafield($orderId: ID!, $metafieldKey: String!, $metafieldValue: String!) {
            metafieldUpsert(input: {
                namespace: "nodnod",
                key: $metafieldKey,
                value: $metafieldValue,
                ownerId: $orderId
            }) {
                metafield {
                    id
                    key
                    value
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `

  try {
    const response = await admin.graphql(orderQuery, {
      variables: {
        orderId: `gid://shopify/Order/${orderId}`,
        metafieldKey,
        metafieldValue
      }
    })

    const { data } = await response.json()
    const order = data.order

    if (!order) {
      throw new Error('Order not found')
    }

    return order
  } catch (error) {
    log(`Error fetching order details: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Get Order Metafield.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} metafieldKey - The key of the metafield to update.
 * @returns {Promise<Object>} - The API response.
 */
export async function getOrderMetafield(admin, orderId, metafieldKey) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId || !metafieldKey) {
    throw new Error('Missing parameters for getting order metafield')
  }

  const orderQuery = `
        query getOrderMetafield($orderId: ID!, $metafieldKey: String!) {
            order(id: $orderId) {
                metafields(first: 10, namespace: "nodnod") {
                    edges {
                        node {
                            id
                            key
                            value
                        }
                    }
                }
            }
        }
    `

  try {
    const response = await admin.graphql(orderQuery, {
      variables: {
        orderId: `gid://shopify/Order/${orderId}`,
        metafieldKey
      }
    })

    const { data } = await response.json()
    const order = data.order

    if (!order) {
      throw new Error('Order not found')
    }

    return order
  } catch (error) {
    log(`Error fetching order details: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Get Fulfillment Order IDs for a given Order ID.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise<Array>} - Array of fulfillment order IDs.
 */
async function getFulfillmentOrderIds(admin, orderId) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId) {
    throw new Error('Order ID is required to fetch fulfillment orders')
  }

  const query = `
        query getFulfillmentOrders($orderId: ID!) {
            order(id: $orderId) {
                fulfillmentOrders(first: 10) {
                    nodes {
                        id
                        lineItems(first: 50) {
                            nodes {
                                id
                                remainingQuantity
                                lineItem {
                                    name
                                    sku
                                }
                            }
                        }
                    }
                }
            }
        }
    `

  try {
    const { data, errors } = await admin.request(query, {
      variables: {
        orderId: `gid://shopify/Order/${orderId}`
      }
    })
        
    if (errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`)
    }

    if (!data.order) {
      throw new Error('Order not found')
    }

    if (!data.order || !data.order.fulfillmentOrders) {
      return []
    }

    return data.order.fulfillmentOrders.nodes
  } catch (error) {
    log(`Error fetching fulfillment orders: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Fulfill Order.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to fulfill.
 * @param {boolean} notifyCustomer - Whether to notify the customer.
 * @param {Object} trackingInfo - Tracking information.
 * @returns {Promise<Object>} - The API response.
 */
export async function fulfillOrder(admin, orderId, notifyCustomer = true, trackingInfo = {}) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId) {
    throw new Error('Order ID is required for fulfillment')
  }

  // First get the fulfillment order IDs
  const fulfillmentOrders = await getFulfillmentOrderIds(admin, orderId)
  if (fulfillmentOrders.length === 0) {
    throw new Error('No fulfillment orders found for this order')
  }

  // For simplicity, we will fulfill the first fulfillment order
  // If there is only 1 location, only 1 fulfillment order will exist
  // If the order has been partially fulfilled, then multiple fulfillment orders may exist
  const fulfillmentOrderId = fulfillmentOrders[0].id

  const fulfillQuery = `
        mutation fulfillOrder($fulfillment: FulfillmentV2Input!) {
            fulfillmentCreateV2(fulfillment: $fulfillment) {
                fulfillment {
                    id
                    status
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `

  log(`Fulfilling fulfillment order ID: ${fulfillmentOrderId}`, 'INFO')

  try {
    const { data, errors } = await admin.request(fulfillQuery, {
      variables: {
        fulfillment: {
          lineItemsByFulfillmentOrder: [
            {
              fulfillmentOrderId: fulfillmentOrderId,
            }
          ],
          trackingInfo: {
            number: trackingInfo.number || '',
            url: trackingInfo.url || '',
            company: trackingInfo.company || ''
          },
          notifyCustomer
        }
                
      }
    })

    log(`Fulfillment response data: ${JSON.stringify(data)}`, 'INFO')
        
    if (errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`)
    }

    const fulfillment = data.fulfillmentCreateV2.fulfillment

    if (!fulfillment) {
      throw new Error('Fulfillment failed')
    }

    return fulfillment
  } catch (error) {
    log(`Error fulfilling order: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Cancel Order.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to cancel.
 * @param {string} reason - The reason for cancellation.
 * @param {boolean} restockItems - Whether to restock items.
 * @param {Array} lineItems - Specific line items to cancel (optional).
 * @param {boolean} notifyCustomer - Whether to notify the customer.
 * @returns {Promise<Object>} - The API response.
 */
export async function cancelOrder(admin, orderId, reason = 'OTHER', restockItems = false, lineItems = [], notifyCustomer = true) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId) {
    throw new Error('Order ID is required for cancellation')
  }

  if (!['CUSTOMER', 'DECLINED', 'FRAUD', 'OTHER', 'INVENTORY', 'STAFF'].includes(reason)) {
    throw new Error('Invalid reason for cancellation')
  }

  // If lineItems is empty, we will cancel the entire order
  if (lineItems.length === 0) {
    const cancelQuery = `
      mutation cancelOrder($orderId: ID!, $reason: OrderCancelReason!, $restockItems: Boolean!, $notifyCustomer: Boolean!) {
        orderCancel(orderId: $orderId, reason: $reason, restock: $restockItems, notifyCustomer: $notifyCustomer) {
          job {
            id
            done
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    try {
      const { errors } = await admin.request(cancelQuery, {
        variables: {
          orderId: `gid://shopify/Order/${orderId}`,
          reason,
          restockItems,
          notifyCustomer
        }
      })

      if (errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`)
      } else {
        return true
      }
    } catch (error) {
      log(`Error canceling order: ${error.message}`, 'ERROR')
      throw error
    }
  } else {
    try {
      const orderEdited = await editOrderQty(admin, orderId, lineItems, reason, notifyCustomer)

      return true
    } catch (error) {
      log(`Error editing order: ${error.message}`, 'ERROR')
      throw error
    }
  }
}

/** Edit Order Quantity (for partial cancellations).
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to edit.
 * @param {Array} lineItems - Line items to adjust with their new quantities.
 * @param {string} reason - The reason for cancellation.
 * @param {boolean} notifyCustomer - Whether to notify the customer.
 * @returns {Promise<Object>} - The API response.
 */
async function editOrderQty(admin, orderId, lineItems = [], reason = 'OTHER', notifyCustomer = true) {
  if (lineItems.length === 0) {
    throw new Error('Line items are required for editing order quantity')
  }

  // Begin order edit session
  const editOrderBeginQuery = `
      mutation beginEditOrder($orderId: ID!) {
          orderEditBegin(id: $orderId) {
              calculatedOrder {
                  id
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        sku
                      }
                    }
                  }
              }
          }
      }
  `

  let calculatedOrder = null
  try {
    const { data: { orderEditBegin } } = await admin.request(editOrderBeginQuery, {
      variables: {
        orderId: `gid://shopify/Order/${orderId}`
      }
    })
    if (!orderEditBegin.calculatedOrder) {
      throw new Error('Failed to begin order edit')
    }
    calculatedOrder = orderEditBegin.calculatedOrder
  } catch (error) {
    log(`Error beginning order edit: ${error.message}`, 'ERROR')
    throw error
  }
  
  if (!calculatedOrder.id) {
    throw new Error('Calculated order ID not found after beginning edit')
  }

  // Update quantities for each line item
  const orderLineItems = calculatedOrder.lineItems.edges.map(edge => edge.node)
  if (orderLineItems.length === 0) {
    throw new Error('No line items found for this order')
  }

  // Map lineItems (with sku) to include the Shopify line item id from orderLineItems
  const mappedLineItems = lineItems.map(item => {
    const matchedOrderItem = orderLineItems.find(orderItem => orderItem.sku === item.sku)
    return matchedOrderItem
      ? { id: matchedOrderItem.id, quantity: item.quantity, restockItem: item.restockItem }
      : null
  }).filter(Boolean)

  if (mappedLineItems.length === 0) {
    throw new Error('None of the provided line items match the order')
  }

  console.log('Mapped Line Items for Edit:', mappedLineItems)

  try {    
    await Promise.all(
      mappedLineItems.map(item =>
        updateLineItemQuantity(admin, calculatedOrder.id, item.id, parseInt(item.quantity), item.restockItem)
      )
    )
  } catch (error) {
    log(`Error updating line item quantities: ${error.message}`, 'ERROR')
    throw error
  }

  // End order edit session
  const editOrderEndQuery = `
    mutation commitEdit($id: ID!, $notifyCustomer: Boolean!, $reason: String!) {
      orderEditCommit(id: $id, notifyCustomer: $notifyCustomer, staffNote: $reason) {
        order {
          id
        }
      }
    }
  `
  try {
    const { data, errors } = await admin.request(editOrderEndQuery, {
      variables: {
        id: calculatedOrder.id,
        notifyCustomer,
        reason
      }
    })

    log(`Order Edit Commit Response: ${JSON.stringify(data)}`, 'INFO')
    if (errors && errors.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(errors)}`)
    }
    return true
  } catch (error) {
    log(`Error ending order edit: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Get Order Line Items.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} orderId - The ID of the order to fetch.
 * @returns {Promise<Object>} - The API response.
 */
async function getOrderLineItems(admin, orderId) {
  if (!admin) {
    throw new Error('Admin client is required')
  }

  if (!orderId) {
    throw new Error('Order ID is required to fetch order details')
  }

  const orderQuery = `
    query getOrderDetails($orderId: ID!) {
      order(id: $orderId) {
        id
        lineItems(first: 50) {
          edges {
            node {
              id
              quantity
              sku
            }
          }
        }
      }
    }
  `

  try {
    const { data, errors } = await admin.request(orderQuery, {
      variables: {
        orderId: `gid://shopify/Order/${orderId}`
      }
    })

    const order = data.order

    if (!order) {
      throw new Error('Order not found')
    }

    if (errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`)
    }

    log(`Fetched order details: ${JSON.stringify(order)}`, 'INFO')

    return order.lineItems.edges.map(edge => edge.node)
  } catch (error) {
    log(`Error fetching order details: ${error.message}`, 'ERROR')
    throw error
  }
}

/**
 * Update Line Item Quantity in an Order Edit session.
 * @param {Object} admin - The Shopify admin client.
 * @param {string} calculatedOrderId - The ID of the calculated order (from order edit session).
 * @param {string} lineItemId - The ID of the line item to update.
 * @param {number} quantity - The new quantity for the line item.
 * @returns {Promise<Object>} - The API response.
 * 
 * Note: This function assumes you are already in an order edit session.
 */
async function updateLineItemQuantity(admin, calculatedOrderId, lineItemId, quantity, restock = false) {
  if (!lineItemId) {
    throw new Error('Line item ID is required to update quantity')
  }

  const editQuery = `
    mutation orderEditSetQuantity($id: ID!, $lineItemId: ID!, $quantity: Int!, $restock: Boolean!) {
      orderEditSetQuantity(id: $id, lineItemId: $lineItemId, quantity: $quantity, restock: $restock) {
        calculatedOrder {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  try {
    const { data } = await admin.request(editQuery, {
      variables: {
        id: calculatedOrderId,
        lineItemId: lineItemId,
        quantity: quantity,
        restock: restock
      }
    })
    log(`Order Edit Set Quantity Response: ${JSON.stringify(data)}`, 'INFO')

    const editedOrder = data.orderEditSetQuantity.calculatedOrder

    if (!editedOrder) {
      throw new Error('Failed to update line item quantity')
    }

    if (data.orderEditSetQuantity.userErrors && data.orderEditSetQuantity.userErrors.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(data.orderEditSetQuantity.userErrors)}`)
    }

    return editedOrder
  } catch (error) {
    log(`Error updating line item quantity: ${error.message}`, 'ERROR')
    throw error
  }
}
