/**
* Parses a date string to a Date object - going from a source.
* @param {string|number} value - The date string to parse
* @returns {Date} Date object
*/
function date (value) {
  if (value) {
    const obj = new Date(value)
    if (!isNaN(obj.getTime())) {
      return obj
    }
  }
  return null
}

module.exports = date
