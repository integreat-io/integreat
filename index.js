// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = {}
integreat.authenticators = require('./lib/authenticators')
integreat.transformers = require('./lib/transformers')

integreat.resources = require('./lib/resources')

// Middleware
integreat.middleware = require('./lib/middleware')

// Utils
integreat.action = require('./lib/utils/createAction')
integreat.queue = require('./lib/queue')
integreat.mergeResources = require('./lib/utils/mergeResources')

module.exports = integreat
