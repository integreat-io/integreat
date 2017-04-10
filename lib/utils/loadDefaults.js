/**
 * Set default adapters, mappers, filters, and auth strategies on a Integreat
 * instance.
 * @param {Object} great - Integreat instance
 */
function loadDefaults (great) {
  // Adapters
  great.adapters.set('json', require('../adapters/json'))

  // Mappers
  great.mappers.set('date', require('../mappers/date'))
  great.mappers.set('float', require('../mappers/float'))
  great.mappers.set('integer', require('../mappers/integer'))
  great.mappers.set('not', require('../mappers/not'))

  // Auth strategies
  great.authStrats.set('token', require('../authStrats/token'))
  great.authStrats.set('options', require('../authStrats/options'))
}

module.exports = loadDefaults
