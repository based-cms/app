import { defineApp } from 'convex/server'
import r2 from '@convex-dev/r2/convex.config'
import polar from '@convex-dev/polar/convex.config'
import betterAuth from './betterAuth/convex.config'

const app = defineApp()
app.use(r2)
app.use(polar)
app.use(betterAuth)

export default app
