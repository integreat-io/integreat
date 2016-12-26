const retrieveFromPath = require('../utils/retrieveFromPath')
const processAttribute = require('./processAttribute')

/**
 * Process a source item and return a matching target item with attributes and
 * relationships.
 * @param {Object} item - The source item to process
 * @param {Object} targetDef - An object with target definitions
 * @returns {Object} Target item
 */
module.exports = function processItem (item, targetDef = {}) {
  // Return null if no item
  if (!item) {
    return null
  }

  // Get parts from target defintions
  const type = targetDef.type || 'item'
  const attrDefs = targetDef.attributes
  const transformItem = targetDef.transform
  const filterItem = targetDef.filter

  // Process attributes
  const attributes = {}
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

  // Create target item
  let target = {attributes, type}

  // Transform target item
  if (transformItem && typeof transformItem === 'function') {
    target = transformItem(target)
  }

  // Set target to null if any filter function returns false
  if (filterItem && typeof filterItem === 'function' && !filterItem(target)) {
    target = null
  }

  // Return target item
  return target
}
