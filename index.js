// Core
const integreat = require('./src/integreat').default

// Resources
integreat.adapters = {}
integreat.authenticators = require('./src/authenticators').default
integreat.transformers = require('./src/transformers').default

integreat.resources = require('./src/resources').default

// Middleware
integreat.middleware = require('./src/middleware').default

// Utils
integreat.action = require('./src/utils/createAction').default
integreat.queue = require('./src/queue').default
integreat.mergeResources = require('./src/utils/mergeResources').default

module.exports = integreat
