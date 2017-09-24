// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authstrats = require('./lib/authstrats')
integreat.formatters = require('./lib/formatters')
integreat.hooks = require('./lib/hooks')
integreat.transformers = require('./lib/transformers')
integreat.workers = require('./lib/workers')

integreat.resources = require('./lib/resources')

// Utils
integreat.action = require('./lib/utils/createAction')

module.exports = integreat
