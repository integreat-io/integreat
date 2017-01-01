/**
 * Parses value string to a float
 * @param {string} value - The string to parse
 * @returns {float} Float value
 */
module.exports = function float (value) {
  // Parse float
  const ret = Number.parseFloat(value)

  // Return null if not a number
  if (isNaN(ret)) {
    return null
  }

  // Return float
  return ret
}
