const prepareValue = require('./prepareValue')

const preparePipeline = (pipeline, collection) => {
  if (!Array.isArray(pipeline)) {
    return null
  }

  const fromCollection = (item) => (typeof item === 'string' && collection) ? collection[item] : item
  const functionsOnly = (item) => item && ['function', 'object'].includes(typeof item)

  return pipeline.map(fromCollection).filter(functionsOnly)
}

const fromTypeDefOnly = (typeVals) => (val) => (typeVals) ? typeVals.hasOwnProperty(val.key) : true

const setFromType = (typeVals) => (val) => {
  if (typeVals) {
    const {type, default: defaultFrom} = typeVals[val.key]
    return Object.assign({}, val, {type, defaultFrom})
  }
  return val
}

const defaultAttrs = {
  id: {type: 'string'},
  createdAt: {type: 'date'},
  updatedAt: {type: 'date'}
}

/**
 * Prepare the item definition format for item creation.
 * @param {Object} def - Item definition object
 * @param {Object} resources - Object with mappers, filters, transforms, and type
 * @returns {Object} An object groomed and ready for the itemMapper function
 */
function prepareItem (def, {mappers, filters, transforms, typeDef = {}} = {}) {
  const {type, path, attributes, relationships, map: mapDef, filter: filterDef} = def || {}
  const typeAttrs = (typeDef.attributes) ? Object.assign({}, defaultAttrs, typeDef.attributes) : null

  const typedAttrsOnly = fromTypeDefOnly(typeAttrs)
  const setAttrFromType = setFromType(typeAttrs)
  const createAttr = (attr) => prepareValue(attr, {transforms})
  const attrs = (attributes) ? attributes.filter(typedAttrsOnly).map(setAttrFromType).map(createAttr) : null

  const typedRelsOnly = fromTypeDefOnly(typeDef.relationships)
  const setRelFromType = setFromType(typeDef.relationships)
  const createRel = (rel) => prepareValue(rel, {transforms, isRel: true})
  const rels = (relationships) ? relationships.filter(typedRelsOnly).map(setRelFromType).map(createRel) : null

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
