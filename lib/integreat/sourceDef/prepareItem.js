const prepareValue = require('./prepareValue')

const preparePipeline = (pipeline, collection) => {
  if (!Array.isArray(pipeline)) {
    return null
  }

  const fromCollection = (item) => (typeof item === 'string' && collection) ? collection[item] : item
  const functionsOnly = (item) => item && ['function', 'object'].includes(typeof item)

  return pipeline.map(fromCollection).filter(functionsOnly)
}

/**
 * Prepare the item definition format for item creation.
 * @param {Object} def - Item definition object
 * @param {Object} resources - Object with mappers, filters, and transforms
 * @returns {Object} An object groomed and ready for the itemMapper function
 */
function prepareItem (def, {mappers, filters, transforms} = {}) {
  const {type, path, attributes, relationships, map: mapDef, filter: filterDef} = def || {}

  const createAttr = (attr) => prepareValue(attr, {transforms})
  const attrs = (attributes) ? attributes.map(createAttr) : null

  const createRel = (rel) => prepareValue(rel, {transforms, isRel: true})
  const rels = (relationships) ? relationships.map(createRel) : null

  let filterFrom = null
  let filterTo = null
  if (Array.isArray(filterDef)) {
    filterFrom = preparePipeline(filterDef, filters)
  } else if (typeof filterDef === 'object') {
    filterFrom = preparePipeline(filterDef.from, filters)
    filterTo = preparePipeline(filterDef.to, filters)
  }
  const map = preparePipeline(mapDef, mappers)

  return {
    type,
    path,
    attrs,
    rels,
    map,
    filterFrom,
    filterTo
  }
}

module.exports = prepareItem
