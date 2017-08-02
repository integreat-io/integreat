// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authstrats = require('./lib/authstrats')
integreat.formatters = require('./lib/formatters')
integreat.workers = require('./lib/workers')

// Utils
integreat.action = require('./lib/utils/createAction')

module.exports = integreat
