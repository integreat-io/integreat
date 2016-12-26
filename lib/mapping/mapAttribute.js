const callIfFunction = (fn, value) => {
  if (fn && typeof fn === 'function') {
    return fn(value)
  }
  return value
}

/**
 * Map an attribute value.
 * @param {Object} value - The source value to map from
 * @param {Object} defaultValue - The value to use if source value is null or undefined
 * @param {function} parse - Function to parse the source value
 * @param {function} transform - Function to transform source value
 * @param {function} format - Function to format source value to target value format
 * @returns {Object} Target value
 */
module.exports = function mapAttribute (value, defaultValue, parse, transform, format) {
  // Return default value if value is not given
  if (value === null || value === undefined) {
    return defaultValue
  }

  // Parse, transform, and format
  let ret = value
  ret = callIfFunction(parse, ret)
  ret = callIfFunction(transform, ret)
  ret = callIfFunction(format, ret)

  return ret
}
