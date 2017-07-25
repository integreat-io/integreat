// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.auths = require('./lib/auths')
integreat.formatters = require('./lib/formatters')
integreat.workers = require('./lib/workers')

// Utils
integreat.action = require('./lib/utils/createAction')

module.exports = integreat
