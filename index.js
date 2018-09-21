// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authstrats = require('./lib/authstrats')
integreat.transformers = require('./lib/transformers')
integreat.mutators = require('./lib/mutators')

integreat.resources = require('./lib/resources')

// Middleware
integreat.middleware = require('./lib/middleware')

// Utils
integreat.action = require('./lib/utils/createAction')
integreat.queue = require('./lib/queue')

module.exports = integreat
