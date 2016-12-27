/**
 * Parses value string to an integer
 * @param {string} value - The string to parse
 * @returns {int} Integer value
 */
module.exports = function integer (value) {
  // Parse integer from string
  const ret = Number.parseInt(value, 10)

  // Return null if not a number
  if (isNaN(ret)) {
    return null
  }

  // Return integer
  return ret
}
