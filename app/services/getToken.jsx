import axios from 'axios';
import redisClient from './redisClient';

const getToken = async () => {
    const serverUrl = process.env.REVOLVE_SERVER_URL;
    const id = process.env.TOKEN_ID;
    const secret = process.env.TOKEN_SECRET;
    try {
        const response = await axios.get(serverUrl + '/content/checkout/shopify/access/signin', {
            params: { id, secret }
        });
        const { token, userId } = response.data;
        if (token) {
            await redisClient.set('revolve_token', token);
        }
        if (userId) {
            await redisClient.set('revolve_userId', userId);
        }
        return { token, userId };
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
};

export default getToken;