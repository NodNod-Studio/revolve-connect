import fetch from 'node-fetch'
import redisClient from './redisClient'
import { log } from '../utils/logger'

const getToken = async () => {
  const serverUrl = process.env.REVOLVE_SERVER_URL
  const id = process.env.TOKEN_ID
  const secret = process.env.TOKEN_SECRET
  try {
    const response = await fetch(serverUrl + '/content/checkout/shopify/access/signin', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, secret })
    })
    const { token, userId } = await response.json()
    if (token) {
      await redisClient.set('revolve_token', token)
    }
    if (userId) {
      await redisClient.set('revolve_userId', userId)
    }
    return { token, userId }
  } catch (error) {
    log('Error fetching token: '+ error, 'ERROR')
    throw error
  }
}

export default getToken