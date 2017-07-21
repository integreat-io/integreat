/**
 * Get source from type or source id.
 * @param {Object} datatypes - The datatypes
 * @param {Object} sources - The sources
 * @returns {function} Function to retrieve source from type and source id
 */
function getSource (datatypes, sources) {
  return (type, source) => {
    if (!source && datatypes[type]) {
      source = datatypes[type].source
    }
    return sources[source] || null
  }
}

module.exports = getSource
