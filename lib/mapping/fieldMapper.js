const preparePipeline = require('../utils/preparePipeline')
const mapWithMappers = require('../utils/mapWithMappers')
const {compile: compilePath, get: getPath, set: setPath} = require('../utils/path')

const idFromRel = (rel) => (Array.isArray(rel)) ? rel.map((val) => val.id) : rel && rel.id

const setFieldValue = (target, key, value, isRelationship, isRootKey) => {
  if (isRootKey) {
    return {...target, [key]: value}
  }

  const prop = (isRelationship) ? 'relationships' : 'attributes'
  target[prop] = {...target[prop], [key]: value}
  return target
}

/**
 * Return a value mapper object, with fromSource and toSource methods.
 * @param {Object} def - Value definition with key, type, path, default, and format
 * @param {Object} params - Object with formatters and isRelationship
 * @param {boolean} isRelationship - True if value is relationship
 * @returns {Object} Value mapper object
 */
function fieldMapper ({
  key = null,
  type,
  path = null,
  param = null,
  default: defaultValue = null,
  format = []
} = {},
{
  formatters,
  isRelationship = false
} = {}) {
  if (!type) {
    if (isRelationship) {
      type = key
    } else {
      type = (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string'
    }
  }
  const isRootKey = (!isRelationship && ['id', 'type'].includes(key))

  path = compilePath(path || key)

  const formatPipeline = preparePipeline(format, formatters)

  return {
    key,
    type,

    /**
     * Map a value _from_ a source. Will retrieve the value to map from the data
     * and set it on the target.
     * @param {Object} data - The data to map from
     * @param {Object} target - The object to set mappet value on
     * @param {Object} params - Param object to use for mapping from params
     * @returns {Object} Mapped object
     */
    fromSource (data, target, params = {}) {
      if (key === 'type') {
        return target
      }
      const value = (param) ? params[param] : getPath(data, path)
      if (value === undefined) {
        return target
      }

      const mappedValue = mapWithMappers(value, formatPipeline, /* reverse */ false, value)
      return setFieldValue(target, key, mappedValue, isRelationship, isRootKey)
    },

    /**
     * Map a value _to_ a source. Will retrieve the value to map from the data
     * and set it on the target.
     * @param {Object} value - The data to map from
     * @param {Object} target - The object to set mappet value on
     * @returns {Object} Mapped object
     */
    toSource (data, target = {}) {
      if (!data) {
        return target
      }

      const value = (isRelationship)
        ? data.relationships && idFromRel(data.relationships[key])
        : (isRootKey) ? data[key] : data.attributes && data.attributes[key]

      if (value === undefined) {
        return target
      }

      const mappedValue = mapWithMappers(value, format, /* reverse */ true, value)
      return setPath(target, path, mappedValue)
    }
  }
}

module.exports = fieldMapper
