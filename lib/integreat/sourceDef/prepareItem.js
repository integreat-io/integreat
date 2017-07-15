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
    const {type, default: defaultValue} = typeVals[val.key]
    return Object.assign({}, val, {type, default: defaultValue})
  }
  return val
}

const prepareFilters = (filterDef, filters) => {
  if (Array.isArray(filterDef)) {
    return {
      filterFrom: preparePipeline(filterDef, filters)
    }
  } else if (typeof filterDef === 'object') {
    return {
      filterFrom: preparePipeline(filterDef.from, filters),
      filterTo: preparePipeline(filterDef.to, filters)
    }
  }
  return {}
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
  const {
    type,
    path,
    attributes: attrDefs = [],
    relationships: relDefs = [],
    map: mapDef,
    filter: filterDef
  } = def || {}
  const typeAttrs = Object.assign({}, defaultAttrs, typeDef.attributes)
  const relAttrs = typeDef.relationships

  const attributes = Object.keys(attrDefs)
    .map((key) => Object.assign({key}, attrDefs[key]))
    .filter(fromTypeDefOnly(typeAttrs))
    .map(setFromType(typeAttrs))
    .map((attr) => prepareValue(attr, {transforms}))

  const relationships = Object.keys(relDefs)
    .map((key) => Object.assign({key}, relDefs[key]))
    .filter(fromTypeDefOnly(relAttrs))
    .map(setFromType(relAttrs))
    .map((rel) => prepareValue(rel, {transforms, isRel: true}))

  const {filterFrom = null, filterTo = null} = prepareFilters(filterDef, filters)
  const map = preparePipeline(mapDef, mappers)

  return {
    type,
    path,
    attributes,
    relationships,
    map,
    filterFrom,
    filterTo
  }
}

module.exports = prepareItem
