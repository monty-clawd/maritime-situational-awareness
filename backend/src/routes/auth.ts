import { Router } from 'express'

const router = Router()

router.post('/login', async (req, res) => {
  const { email } = req.body as { email?: string }
  if (!email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  res.json({ token: 'dev-token', user: { email, role: 'operator' } })
})

export default router
