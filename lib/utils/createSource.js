const Source = require('../source')
const ItemMapper = require('../itemMapper')
const ValueMapper = require('../valueMapper')

const setIfDefined = (source, def, props) => {
  props.forEach((prop) => {
    if (def.hasOwnProperty(prop)) {
      source[prop] = def[prop]
    }
  })
}

const setPipeline = (sourcePipeline, defPipeline, getFunction) => {
  if (Array.isArray(defPipeline)) {
    defPipeline.forEach((map) => {
      if (typeof map === 'string' && getFunction) {
        const mapId = (map.endsWith('[]')) ? map.substr(0, map.length - 2) : map
        map = getFunction(mapId)
      }
      if (map !== null && (typeof map === 'function' || typeof map === 'object')) {
        sourcePipeline.push(map)
      }
    })
  }
}

const parseDefault = (defaultDef) => {
  const ret = {from: null, to: null}
  if (defaultDef !== undefined && defaultDef !== null) {
    if (defaultDef.from !== undefined || defaultDef.to !== undefined) {
      ret.from = defaultDef.from
      ret.to = defaultDef.to
    } else {
      ret.from = defaultDef
    }
  }
  return ret
}

const createValueMapper = (def, key, getMapper, isAttrs) => {
  def = def || {}
  const type = def.type || ((!isAttrs) ? key : (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string')
  const defaults = parseDefault(def.default)

  const valueMapper = new ValueMapper(
    key,
    type,
    def.path,
    defaults.from,
    defaults.to
  )

  const mapPipeline = (isAttrs) ? [].concat(def.map, type) : def.map
  setPipeline(valueMapper.map, mapPipeline, getMapper)

  return valueMapper
}

const createItemMapper = (itemDef, getMapper, getFilter) => {
  const itemMapper = new ItemMapper(itemDef.type, itemDef.path)
  setPipeline(itemMapper.map, itemDef.map, getMapper)
  if (typeof itemDef.filter === 'object' && !Array.isArray(itemDef.filter)) {
    setPipeline(itemMapper.filters.from, itemDef.filter.from, getFilter)
    setPipeline(itemMapper.filters.to, itemDef.filter.to, getFilter)
  } else {
    setPipeline(itemMapper.filters.from, itemDef.filter, getFilter)
  }

  // Set attributes
  if (itemDef.attributes) {
    Object.keys(itemDef.attributes).forEach((key) => {
      itemMapper.attrMappers.push(createValueMapper(itemDef.attributes[key], key, getMapper, true))
    })
  }

  // Set relationships
  if (itemDef.relationships) {
    Object.keys(itemDef.relationships).forEach((key) => {
      itemMapper.relMappers.push(createValueMapper(itemDef.relationships[key], key, getMapper, false))
    })
  }

  return itemMapper
}

/**
 * Create a Source instance from a source definition object
 * @param {Object} sourceDef - Source definition object to create Source from
 * @param {function} getAdapter - Function to get an adapter by key
 * @param {function} getMapper - Function to get a mapper by key
 * @param {function} getFilter - Function to get a filter by key
 * @param {function} getAuth - Function to get a live auth strategy by key
 * @returns {Source} The created Source instance
 */
function createSource (sourceDef, getAdapter, getMapper, getFilter, getAuth) {
  if (!sourceDef || !sourceDef.id) {
    return null
  }

  let adapter = null
  if (sourceDef.adapter && typeof getAdapter === 'function') {
    adapter = getAdapter(sourceDef.adapter)
  }

  const source = new Source(sourceDef.id, adapter)

  // Depricated
  if (sourceDef.sync) {
    setIfDefined(source, sourceDef.sync, ['schedule', 'allowRelay', 'allowPush'])
  }

  if (sourceDef.endpoints) {
    setIfDefined(source.endpoints, sourceDef.endpoints, ['one', 'all', 'some', 'send'])
  }

  if (sourceDef.auth && typeof getAuth === 'function') {
    source.auth = getAuth(sourceDef.auth)
  }

  if (sourceDef.items) {
    sourceDef.items.forEach((itemDef) => {
      source.itemMappers[itemDef.type] = createItemMapper(itemDef, getMapper, getFilter)
    })
  }

  return source
}

module.exports = createSource
