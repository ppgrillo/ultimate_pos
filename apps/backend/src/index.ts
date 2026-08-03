import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from './middleware/error'
import { authRouter } from './routes/auth'
import { productsRouter } from './routes/products'
import { categoriesRouter } from './routes/categories'
import { ordersRouter } from './routes/orders'
import { employeesRouter } from './routes/employees'
import { customersRouter } from './routes/customers'
import { storesRouter } from './routes/stores'
import { webhooksRouter } from './routes/webhooks'
import { loyaltyRouter } from './routes/loyalty'
import { appleWalletRouter } from './routes/apple-wallet'
import { walletRouter } from './routes/wallet'
import { filesRouter } from './routes/files'
import { selfCheckoutRouter } from './routes/self-checkout'
import { publicRouter } from './routes/public'
import { promotionsRouter } from './routes/promotions'
import { analyticsRouter } from './routes/analytics'
import { checksRouter } from './routes/checks'
import { rewardsRouter } from './routes/rewards'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }))
app.onError(errorHandler)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/auth', authRouter)
app.route('/products', productsRouter)
app.route('/categories', categoriesRouter)
app.route('/orders', ordersRouter)
app.route('/employees', employeesRouter)
app.route('/customers', customersRouter)
app.route('/stores', storesRouter)
app.route('/webhooks', webhooksRouter)
app.route('/loyalty', loyaltyRouter)
app.route('/apple-wallet', appleWalletRouter)
app.route('/wallet', walletRouter)
app.route('/files', filesRouter)
app.route('/self-checkout', selfCheckoutRouter)
app.route('/public', publicRouter)
app.route('/promotions', promotionsRouter)
app.route('/analytics', analyticsRouter)
app.route('/checks', checksRouter)
app.route('/rewards', rewardsRouter)

const port = Number(process.env.PORT) || 3001

console.log(`Server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
