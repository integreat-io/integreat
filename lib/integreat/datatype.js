const expandVal = (val) => (typeof val === 'string') ? {type: val} : val
const expandVals = (vals) => Object.keys(vals).reduce((newVals, key) =>
  Object.assign(newVals, {[key]: expandVal(vals[key])}
), {})

/**
 * Create a datatype with the given id and source.
 * @param {Object} def - Object with id, source, attributes, and relationships
 * @returns {Object} The created datatype
 */
function datatype ({
  id,
  source,
  attributes: attrDefs,
  relationships: relDefs
}) {
  const attributes = expandVals(attrDefs || {})
  const relationships = expandVals(relDefs || {})

  return {
    id,
    source,
    attributes,
    relationships
  }
}

module.exports = datatype
