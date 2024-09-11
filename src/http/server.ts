import fastify from 'fastify'

const app = fastify()


app
  .listen({
    port: 8080,
  })
  .then(() => {
    console.log('HTTP server running')
  })
