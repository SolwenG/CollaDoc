import express from 'express'
import type { Express } from 'express'
import { routes } from './routes/index.ts'
import { globalMiddlewares } from './middlewares/index.ts'
import { errorHandler } from './middlewares/errors.middleware.ts'
import { db } from './prisma/db.ts'

const app: Express = express()

// Behind exactly one reverse proxy (nginx): req.ip is read from X-Forwarded-For
app.set('trust proxy', 1)

app.use(globalMiddlewares)

app.use(routes)

app.use(errorHandler)

const server = app.listen(process.env.PORT, () =>
    console.log(`✅ Server is running on port ${process.env.PORT}`)
)

async function shutdownServer(signal: NodeJS.Signals) {
    console.log(`${signal} received, shutting down`)
    // close() only stops accepting connections; its callback fires once in-flight requests are done
    await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
    )
    await db.close()
    process.exit(0)
}

process.on('SIGTERM', shutdownServer)
process.on('SIGINT', shutdownServer)
