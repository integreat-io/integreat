const Source = require('.')
const Attribute = require('./attribute')

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
      if (typeof map === 'string') {
        map = (getFunction) ? getFunction(map) : null
      }
      if (map) {
        sourcePipeline.push(map)
      }
    })
  }
}

/**
 * Create a Source instance from a source definition object
 * @param {Object} sourceDef - Source definition object to create Source from
 * @param {function} getAdapter - Function to get an adapter by key
 * @param {function} getMapper - Function to get a mapper by key
 * @param {function} getFilter - Function to get a filter by key
 * @returns {Source} The created Source instance
 */
module.exports = function create (sourceDef, getAdapter, getMapper, getFilter) {
  if (!sourceDef || !sourceDef.itemtype) {
    return null
  }

  // Create source
  const source = new Source(sourceDef.itemtype)

  // Get and set adapter
  if (sourceDef.sourcetype && getAdapter && typeof getAdapter === 'function') {
    source.adapter = getAdapter(sourceDef.sourcetype)
  }

  // Set sync properties
  if (sourceDef.sync) {
    setIfDefined(source, sourceDef.sync, ['schedule', 'allowRelay', 'allowPush'])
  }

  // Set fetch properties
  if (sourceDef.fetch) {
    setIfDefined(source.fetch, sourceDef.fetch, ['endpoint', 'changelog', 'path'])
    setPipeline(source.fetch.map, sourceDef.fetch.map, getMapper)
    setPipeline(source.fetch.filter, sourceDef.fetch.filter, getFilter)
  }

  // Set send properties
  if (sourceDef.send) {
    setIfDefined(source.send, sourceDef.send, ['endpoint'])
    setPipeline(source.send.map, sourceDef.send.map, getMapper)
  }

  // Set item properties
  if (sourceDef.item) {
    setPipeline(source.item.map, sourceDef.item.map, getMapper)
    setPipeline(source.item.filter, sourceDef.item.filter, getFilter)

    // Set attributes
    const attrDefs = sourceDef.item.attributes
    if (attrDefs) {
      Object.keys(attrDefs).forEach((key) => {
        const attrDef = attrDefs[key]
        if (attrDef) {
          let type = attrDef.type
          if (!type && /(cre|upd)atedAt/.test(key)) {
            type = 'date'
          }
          const attr = new Attribute(key, type, attrDef.path, attrDef.defaultValue)
          setPipeline(attr.map, [].concat(attrDef.map, attrDef.type), getMapper)
          source.attributes.push(attr)
        }
      })
    }
  }

  return source
}
