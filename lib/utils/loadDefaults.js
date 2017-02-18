/**
 * Set default adapters, mappers, filters, and auth strategies on a Integreat
 * instance.
 * @param {Object} great - Integreat instance
 */
function loadDefaults (great) {
  // Adapters
  great.setAdapter('json', require('../adapters/json'))

  // Mappers
  great.setMapper('date', require('../mappers/date'))
  great.setMapper('float', require('../mappers/float'))
  great.setMapper('integer', require('../mappers/integer'))

  // Auth strategies
  great.setAuthStrategy('token', require('../authStrats/token'))
  great.setAuthStrategy('options', require('../authStrats/options'))
}

module.exports = loadDefaults
