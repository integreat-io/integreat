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

  // Create source
  let adapter = null
  if (sourceDef.adapter && typeof getAdapter === 'function') {
    adapter = getAdapter(sourceDef.adapter)
  }
  const source = new Source(sourceDef.id, adapter)

  // Set sync properties
  if (sourceDef.sync) {
    setIfDefined(source, sourceDef.sync, ['schedule', 'allowRelay', 'allowPush'])
  }

  // Set fetch properties
  if (sourceDef.fetch) {
    setIfDefined(source.fetch, sourceDef.fetch, ['endpoint', 'changelog'])
    if (sourceDef.fetch.auth && typeof getAuth === 'function') {
      source.fetch.auth = getAuth(sourceDef.fetch.auth)
    }
  }

  // Set send properties
  if (sourceDef.send) {
    setIfDefined(source.send, sourceDef.send, ['endpoint'])
    setPipeline(source.send.map, sourceDef.send.map, getMapper)
    if (sourceDef.send.auth && typeof getAuth === 'function') {
      source.send.auth = getAuth(sourceDef.send.auth)
    }
  }

  // Set item properties
  if (sourceDef.items) {
    const itemDef = sourceDef.items[0]
    const itemMapper = new ItemMapper(itemDef.type, itemDef.path)
    setPipeline(itemMapper.map, itemDef.map, getMapper)
    if (typeof itemDef.filter === 'object' && !Array.isArray(itemDef.filter)) {
      setPipeline(itemMapper.filters.from, itemDef.filter.from, getFilter)
      setPipeline(itemMapper.filters.to, itemDef.filter.to, getFilter)
    } else {
      setPipeline(itemMapper.filters.from, itemDef.filter, getFilter)
    }

    // Set attributes
    const attrDefs = itemDef.attributes
    if (attrDefs) {
      Object.keys(attrDefs).forEach((key) => {
        const attrDef = attrDefs[key]
        if (attrDef) {
          let type = attrDef.type
          if (!type && /(cre|upd)atedAt/.test(key)) {
            type = 'date'
          }
          const defaults = parseDefault(attrDef.default)
          const attrMapper = new ValueMapper(
            key,
            type,
            attrDef.path,
            defaults.from,
            defaults.to
          )
          setPipeline(attrMapper.map, [].concat(attrDef.map, type), getMapper)
          itemMapper.attrMappers.push(attrMapper)
        }
      })
    }
    source.itemMappers[itemDef.type] = itemMapper
  }

  return source
}

module.exports = createSource