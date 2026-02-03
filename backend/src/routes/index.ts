import { Router } from 'express'
import alerts from './alerts.js'
import auth from './auth.js'
import health from './health.js'
import radar from './radar.js'
import status from './status.js'
import vessels from './vessels.js'
import watchlist from './watchlist.js'
import behavior from './behavior.js'
import environment from './environment.js'
import history from './history.js'

const router = Router()

router.use('/health', health)
router.use('/auth', auth)
router.use('/vessels', vessels)
router.use('/alerts', alerts)
router.use('/radar', radar)
router.use('/status', status)
router.use('/watchlist', watchlist)
router.use('/behavior', behavior)
router.use('/environment', environment)
router.use('/history', history)

export default router
