import axios from 'axios';
import redisClient from './redisClient';
import { log } from "../utils/logger"

/**
 * Submits an order paid to Revolve server API.
 * @param {Object} orderPayload - The full order payload from Shopify.
 * @returns {Promise<{response: any}>}
 */
export async function submitOrder(orderPayload) {
    const token = await redisClient.get('revolve_token');
    const userId = await redisClient.get('revolve_userId');

    if (!token || !userId) {
        throw new Error('Missing token or userId');
    }

    if (!orderPayload) {
        throw new Error('Missing order payload');
    }

    if (!orderPayload.financial_status || orderPayload.financial_status !== 'paid') {
        throw new Error('Order is not paid');
    }

    const payload = {
        subId: orderPayload.id,
        gateway: "SHOPIFY",
        platform: "SHOPIFY",
        type: orderPayload.payment_gateway_names ? orderPayload.payment_gateway_names[0] : '',
        paymentId: orderPayload.checkout_id,
        invoice: '',
    };

    // Set invoice


    try {
        const response = await axios.post(process.env.REVOLVE_SERVER_URL + `/content/checkout/shopify/payment?token=${token}&userId=${userId}`, payload);

        if (!response.success) {
            log('Error paid order: ' + JSON.stringify(response), "ERROR");
        }

        return { response: response.orders };
    } catch (error) {
        log('Error paid order: ' + error, "ERROR");
        throw error;
    }
}
