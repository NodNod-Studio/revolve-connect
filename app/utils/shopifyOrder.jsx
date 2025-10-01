import { log } from "./logger";

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
        throw new Error('Admin client is required');
    }

    if (!orderId || !metafieldKey || !metafieldValue) {
        throw new Error('Missing parameters for saving order metafield');
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
            throw new Error('Order not found');
        }

        return order;
    } catch (error) {
        log(`Error fetching order details: ${error.message}`, "ERROR");
        throw error;
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
        throw new Error('Admin client is required');
    }

    if (!orderId || !metafieldKey) {
        throw new Error('Missing parameters for getting order metafield');
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
            throw new Error('Order not found');
        }

        return order;
    } catch (error) {
        log(`Error fetching order details: ${error.message}`, "ERROR");
        throw error;
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
        throw new Error('Admin client is required');
    }

    if (!orderId) {
        throw new Error('Order ID is required to fetch fulfillment orders');
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
            throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
        }

        if (!data.order) {
            throw new Error('Order not found');
        }

        if (!data.order || !data.order.fulfillmentOrders) {
            return [];
        }

        return data.order.fulfillmentOrders.nodes;
    } catch (error) {
        log(`Error fetching fulfillment orders: ${error.message}`, "ERROR");
        throw error;
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
        throw new Error('Admin client is required');
    }

    if (!orderId) {
        throw new Error('Order ID is required for fulfillment');
    }

    // First get the fulfillment order IDs
    const fulfillmentOrders = await getFulfillmentOrderIds(admin, orderId);
    if (fulfillmentOrders.length === 0) {
        throw new Error('No fulfillment orders found for this order');
    }

    // For simplicity, we will fulfill the first fulfillment order
    // If there is only 1 location, only 1 fulfillment order will exist
    // If the order has been partially fulfilled, then multiple fulfillment orders may exist
    const fulfillmentOrderId = fulfillmentOrders[0].id;

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

    log(`Fulfilling fulfillment order ID: ${fulfillmentOrderId}`, "INFO");

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
                        number: trackingInfo.number || "",
                        url: trackingInfo.url || "",
                        company: trackingInfo.company || ""
                    },
                    notifyCustomer
                }
                
            }
        })

        log(`Fulfillment response data: ${JSON.stringify(data)}`, "INFO");
        
        if (errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
        }

        const fulfillment = data.fulfillmentCreateV2.fulfillment

        if (!fulfillment) {
            throw new Error('Fulfillment failed');
        }

        return fulfillment;
    } catch (error) {
        log(`Error fulfilling order: ${error.message}`, "ERROR");
        throw error;
    }
}