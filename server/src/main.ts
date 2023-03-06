import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { renderTrpcPanel } from 'trpc-panel'
import { createContext } from '/src/context'
import { appRouter } from '/src/routers'
// import ws from '@fastify/websocket'

const HOST = '127.0.0.1'
const PORT = '3000'

const server = fastify({
  maxParamLength: 5000,
})

// server.register(ws)

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
})

server.route({
  url: '/panel',
  method: ['GET', 'POST'],
  handler(_, reply) {
    return reply
      .type('text/html')
      .send(renderTrpcPanel(appRouter, { url: `http://${HOST}:${PORT}/trpc` }))
  },
})

void (async () => {
  try {
    await server.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
})()
