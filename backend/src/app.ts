import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import apiRoutes from './routes'
import { env } from './config/env'
import { logger } from './services/logger'
import { errorHandler, notFound } from './middleware/errorHandler'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(pinoHttp({ logger }))

app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
