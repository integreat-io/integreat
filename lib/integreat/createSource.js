const Source = require('./source')
const ItemMapper = require('./source/itemMapper')
const ValueMapper = require('./source/valueMapper')

const setIfDefined = (source, def, props, formatFn) => {
  props.forEach((prop) => {
    if (def.hasOwnProperty(prop)) {
      source[prop] = (formatFn) ? formatFn(def[prop]) : def[prop]
    }
  })
}

const setPipeline = (sourcePipeline, defPipeline, mappers) => {
  if (Array.isArray(defPipeline)) {
    defPipeline.forEach((map) => {
      if (typeof map === 'string' && mappers) {
        const mapId = (map.endsWith('[]')) ? map.substr(0, map.length - 2) : map
        map = mappers[mapId] || null
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

const createValueMapper = (def, key, mappers, isAttrs) => {
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
  setPipeline(valueMapper.map, mapPipeline, mappers)

  return valueMapper
}

const createItemMapper = (itemDef, mappers, filters) => {
  const itemMapper = new ItemMapper(itemDef.type, itemDef.path)
  setPipeline(itemMapper.map, itemDef.map, mappers)
  if (typeof itemDef.filter === 'object' && !Array.isArray(itemDef.filter)) {
    setPipeline(itemMapper.filters.from, itemDef.filter.from, filters)
    setPipeline(itemMapper.filters.to, itemDef.filter.to, filters)
  } else {
    setPipeline(itemMapper.filters.from, itemDef.filter, filters)
  }

  // Set attributes
  if (itemDef.attributes) {
    Object.keys(itemDef.attributes).forEach((key) => {
      itemMapper.attrMappers.push(createValueMapper(itemDef.attributes[key], key, mappers, true))
    })
  }

  // Set relationships
  if (itemDef.relationships) {
    Object.keys(itemDef.relationships).forEach((key) => {
      itemMapper.relMappers.push(createValueMapper(itemDef.relationships[key], key, mappers, false))
    })
  }

  return itemMapper
}

/**
 * Create a Source instance from a source definition object
 * @param {Object} sourceDef - Source definition object to create Source from
 * @param {Object} resources - Object with adapters, mappers, filters, and auths
 * @returns {Source} The created Source instance
 */
function createSource (sourceDef, {adapters = {}, mappers = {}, filters = {}, auths = {}} = {}) {
  if (!sourceDef || !sourceDef.id) {
    return null
  }

  const adapter = adapters[sourceDef.adapter]
  const source = new Source(sourceDef.id, adapter)

  // Depricated
  if (sourceDef.sync) {
    setIfDefined(source, sourceDef.sync, ['schedule', 'allowRelay', 'allowPush'])
  }

  if (sourceDef.baseUri) {
    source.baseUri = sourceDef.baseUri
  }

  if (sourceDef.endpoints) {
    const formatEndpoint = (value) => (typeof value === 'string') ? {uri: value} : value
    setIfDefined(source.endpoints, sourceDef.endpoints, ['one', 'all', 'some', 'send'], formatEndpoint)
  }

  if (sourceDef.auth && auths) {
    source.auth = auths[sourceDef.auth]
  }

  if (sourceDef.items) {
    sourceDef.items.forEach((itemDef) => {
      source.itemMappers[itemDef.type] = createItemMapper(itemDef, mappers, filters)
    })
  }

  return source
}

module.exports = createSource
