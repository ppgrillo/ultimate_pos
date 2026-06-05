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

const port = Number(process.env.PORT) || 3001

console.log(`Server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
