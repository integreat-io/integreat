/**
 * Parses a date string to a Date object.
 * @param {string} value - The date string to parse
 * @returns {Date} Date object
 */
module.exports = function date (value) {
  // Return null if no value
  if (!value) {
    // return null
  }

  // Create date object
  const ret = new Date(value)

  // Return null if not a valid date
  if (isNaN(ret.getTime())) {
    return null
  }

  // Return date object
  return ret
}
