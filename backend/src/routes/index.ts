import { Router } from 'express'
import alerts from './alerts'
import auth from './auth'
import health from './health'
import radar from './radar'
import status from './status'
import vessels from './vessels'

const router = Router()

router.use('/health', health)
router.use('/auth', auth)
router.use('/vessels', vessels)
router.use('/alerts', alerts)
router.use('/radar', radar)
router.use('/status', status)

export default router
