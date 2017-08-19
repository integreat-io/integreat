const date = {
  /**
  * Parses a date string to a Date object - going from a source.
  * @param {string|number} value - The date string to parse
  * @returns {Date} Date object
  */
  from (value) {
    if (value) {
      const obj = new Date(value)
      if (!isNaN(obj.getTime())) {
        return obj
      }
    }
    return null
  },

  /**
   * Generate a timestamp from a date - going to a source.
   * @param {Date} value - The date to generate timestamp from
   * @returns {number} Timestamp
   */
  to (value) {
    if (value) {
      const timestamp = (new Date(value)).getTime()
      if (!isNaN(timestamp)) {
        return timestamp
      }
    }
    return null
  }
}

module.exports = date
