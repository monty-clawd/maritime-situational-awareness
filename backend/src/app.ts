import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import apiRoutes from './routes/index.js'
import { env } from './config/env.js'
import { logger } from './services/logger.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: '*', // Temporarily permissive for debugging
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(pinoHttp({ logger }))

app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
