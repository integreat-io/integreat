const error = require('debug')('great:error')

const callMapper = (mapperFn, value, data) => {
  if (typeof mapperFn === 'function') {
    try {
      return (Array.isArray(value))
        ? value.map((value) => mapperFn(value, data))
        : mapperFn(value, data)
    } catch (e) {
      error('Mapper function threw error: %s', e)
    }
  }

  return value
}

const mapOne = (value, mapper, reverse, data) => {
  // Get the mapper function - from mapper object or use mapper function if
  // we're in default direction
  let mapperFn = (reverse) ? null : mapper
  if (mapper && typeof mapper === 'object') {
    mapperFn = (reverse) ? mapper.to : mapper.from
  }

  // Map and return
  return callMapper(mapperFn, value, data)
}

/**
 * Map a value with an array of mappers. Mappers can be functions or map objects.
 * A map object may have a `from` function, a `to` function, or both.
 * The default direction for mapping is from service to target, and the `from`
 * functions are used in mapper objects. If `reverse` is `true`, the direction
 * is reversed, the mappers are executed from the end of the array, and `to`
 * functions are used in mapper objects.
 * @param {Object} value - The service value to map from
 * @param {array} mappers - Array of mappers (map functions or map objects)
 * @param {boolean} reverse - True indicates that we are mapping in oposite
 * @param {Object} data - Data to pass on to mapper function. Usually the original data
 * direction - from target to service
 * @returns {Object} Mapped value
 */
module.exports = function mapWithMappers (value, mappers, reverse = false, data) {
  if (!Array.isArray(mappers)) {
    return value
  }

  const reduceFn = (reverse) ? 'reduceRight' : 'reduce'
  return mappers[reduceFn]((value, mapper) => mapOne(value, mapper, reverse, data), value)
}
