import type { NextFunction, Request, Response } from 'express'
import { logger } from '../services/logger.js'

export class HttpError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }
}

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path })
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500
  const payload = {
    error: err.message,
    details: err instanceof HttpError ? err.details : undefined,
  }

  logger.error({ err, statusCode }, 'Request failed')
  res.status(statusCode).json(payload)
}
