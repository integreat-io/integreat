// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authstrats = require('./lib/authstrats')
integreat.transformers = require('./lib/transformers')
integreat.formatters = require('./lib/formatters')
integreat.workers = require('./lib/workers')

integreat.resources = require('./lib/resources')

// Utils
integreat.action = require('./lib/utils/createAction')

module.exports = integreat
