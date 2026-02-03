import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  AISSTREAM_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)
