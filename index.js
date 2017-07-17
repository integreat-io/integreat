// Core
const integreat = require('./lib/integreat')

// Resources
integreat.adapters = require('./lib/adapters')
integreat.authStrats = require('./lib/authStrats')
integreat.transforms = require('./lib/transforms')
integreat.workers = require('./lib/workers')

// Utils
integreat.action = require('./lib/utils/createAction')

module.exports = integreat
