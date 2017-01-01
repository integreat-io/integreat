const mapOne = (value, mapper, reverse) => {
  // Get the mapper function - from mapper object or use mapper function if
  // we're in default direction
  let mapperFn = (reverse) ? null : mapper
  if (mapper && typeof mapper === 'object') {
    mapperFn = (reverse) ? mapper.to : mapper.from
  }

  // Map and return
  if (mapperFn && typeof mapperFn === 'function') {
    return mapperFn(value)
  }

  // Return original value if no mapper function is found
  return value
}

/**
 * Map a value with an array of mappers. Mappers can be functions or map objects.
 * A map object may have a `from` function, a `to` function, or both.
 * The default direction for mapping is from source to target, and the `from`
 * functions are used in mapper objects. If `reverse` is `true`, the direction
 * is reversed, the mappers are executed from the end of the array, and `to`
 * functions are used in mapper objects.
 * @param {Object} value - The source value to map from
 * @param {array} mappers - Array of mappers (map functions or map objects)
 * @param {boolean} reverse - True indicates that we are mapping in oposite
 * direction - from target to source
 * @returns {Object} Mapped value
 */
module.exports = function mapWithMappers (value, mappers, reverse) {
  if (Array.isArray(mappers)) {
    // Reduce from array of mappers - from end of array if reverse
    if (reverse) {
      return mappers.reduceRight((value, mapper) => mapOne(value, mapper, reverse), value)
    } else {
      return mappers.reduce((value, mapper) => mapOne(value, mapper, reverse), value)
    }
  } else {
    // Map with one mapper
    return mapOne(value, mappers, reverse)
  }
}
