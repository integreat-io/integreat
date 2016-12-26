const retrieveFromPath = require('../utils/retrieveFromPath')
const processAttribute = require('./processAttribute')

/**
 * Process a source item and return a matching target item with attributes and
 * relationships.
 * @param {Object} item - The source item to process
 * @param {string} type - The type of the returned item
 * @param {Object} attrDefs - An object with attribute definitions
 * @param {Object} relDefs - An object with relationshi definitions
 * @returns {Object} Target item
 */
module.exports = function processItem (item, type = 'item', attrDefs, relDefs) {
  if (!item) {
    return null
  }
  const attributes = {}

  // Process attributes
  if (attrDefs && typeof attrDefs === 'object') {
    Object.keys(attrDefs).forEach((attrName) => {
      const {path, defaultValue, parse, transform, format} = attrDefs[attrName]
      const value = retrieveFromPath(item, path)

      attributes[attrName] = processAttribute(value, defaultValue, parse, transform, format)

      if (attributes[attrName] === undefined) {
        attributes[attrName] = null
      }
    })
  }

  return {attributes, type}
}
