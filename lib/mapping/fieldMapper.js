const fromSource = require('./fieldFromSource')
const toSource = require('./fieldToSource')
const preparePipeline = require('../utils/preparePipeline')
const {compile: compilePath} = require('../utils/path')

const prepareType = (type, key, isRelationship) => type ||
  ((isRelationship) ? key
    : (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string')

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
  type = prepareType(type, key, isRelationship)
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
      return fromSource(data, target, params, {
        key, path, param, formatPipeline, isRelationship, isRootKey
      })
    },

    /**
     * Map a value _to_ a source. Will retrieve the value to map from the data
     * and set it on the target.
     * @param {Object} value - The data to map from
     * @param {Object} target - The object to set mappet value on
     * @returns {Object} Mapped object
     */
    toSource (data, target = {}) {
      return toSource(data, target, {
        key, path, formatPipeline
      })
    }
  }
}

module.exports = fieldMapper
