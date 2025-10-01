import Redis from 'ioredis'
import { log } from '../utils/logger'

const redis = new Redis(process.env.UPSTASH_REDIS_URL)

log('Redis client initialized and connected.')
export default redis
