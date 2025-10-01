import fetch from 'node-fetch';
import redisClient from './redisClient';
import { log } from "../utils/logger"

/**
 * Submits an order to Revolve server API.
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

    const payload = {
        subId: orderPayload.id,
        origin: "SHOPIFY",
        user: {},
        shippingAddress: {},
        shippingOption: "ontrac",
        promoCode: {},
        shoppingBag: {},
    };

    // Extract coupon codes from discount codes and applications
    const discountCodes = orderPayload.discount_codes.concat(orderPayload.discount_applications);
    const coupon = discountCodes.length
      ? discountCodes.map(d => d.code || d.title).join(', ')
      : '';

    payload.promoCode = { code: coupon };

    // Build shipping address
    payload.shippingAddress = orderPayload.shipping_address ? {
        name: `${orderPayload.shipping_address.first_name} ${orderPayload.shipping_address.last_name}`,
        street: orderPayload.shipping_address.address1,
        street2: orderPayload.shipping_address.address2,
        city: orderPayload.shipping_address.city,
        zipCode: orderPayload.shipping_address.zip,
        country: orderPayload.shipping_address.country,
        countryCode: orderPayload.shipping_address.country_code,
        state: orderPayload.shipping_address.province,
    } : null;


    payload.user = { email: orderPayload.email || '' };

    // Build shopping bag items
    payload.shoppingBag = {
        cartItems: orderPayload.line_items.map(item => ({
            code: item.sku,
            quantity: item.quantity,
            size: item.variant_title || '',
        }))
    };

    // TODO
    // giftCodes: coupon,


    try {
        const response = await fetch(process.env.REVOLVE_SERVER_URL + `/content/checkout/shopify/order?token=${token}&userId=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!responseData.success) {
            log('Error submitting order: ' + JSON.stringify(responseData), "ERROR");
        } else {
            const invoice = responseData.orders.instock.invoice;

            // save invoice in a order metafield

        }

        return { response: response };
    } catch (error) {
        log('Error submitting order: ' + error, "ERROR");
        throw error;
    }
}
