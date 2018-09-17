const fromService = require('./fieldFromService')
const toService = require('./fieldToService')
const preparePipeline = require('../utils/preparePipeline')
const { compile: compilePath } = require('../utils/path')

const prepareType = (type, key, isRelationship) => type ||
  ((isRelationship) ? key
    : (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string')

/**
 * Return a value mapper object, with fromService and toService methods.
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
     * Map a value _from_ a service. Will retrieve the value to map from the data
     * and set it on the target.
     * @param {Object} data - The data to map from
     * @param {Object} target - The object to set mappet value on
     * @param {Object} params - Param object to use for mapping from params
     * @returns {Object} Mapped object
     */
    fromService (data, target, params = {}) {
      return fromService(data, target, params, {
        key, path, param, formatPipeline, isRelationship, isRootKey
      })
    },

    /**
     * Map a value _to_ a service. Will retrieve the value to map from the data
     * and set it on the target.
     * @param {Object} value - The data to map from
     * @param {Object} target - The object to set mappet value on
     * @returns {Object} Mapped object
     */
    toService (data, target = {}) {
      return toService(data, target, {
        key, path, formatPipeline
      })
    }
  }
}

module.exports = fieldMapper
