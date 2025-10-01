import { log } from "./logger";
import fetch from 'node-fetch';

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