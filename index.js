// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authstrats = require('./lib/authstrats')
integreat.formatters = require('./lib/formatters')
integreat.hooks = {}
integreat.transformers = require('./lib/transformers')
integreat.workers = require('./lib/workers')

integreat.resources = require('./lib/resources')

// Utils
integreat.action = require('./lib/utils/createAction')
integreat.queue = require('./lib/queue')

module.exports = integreat
