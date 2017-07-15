const expandVal = (val) => (typeof val === 'string') ? {type: val} : val
const expandVals = (vals) => Object.keys(vals).reduce((newVals, key) =>
  Object.assign(newVals, {[key]: expandVal(vals[key])}
), {})

function prepareTypes (type) {
  const attributes = expandVals(type.attributes || {})
  const relationships = expandVals(type.relationships || {})
  return Object.assign({}, type, {attributes, relationships})
}

module.exports = prepareTypes
