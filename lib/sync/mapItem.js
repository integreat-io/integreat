const uuid = require('uuid/v4')
const retrieveFromPath = require('../utils/retrieveFromPath')
const mapAttribute = require('./mapAttribute')

/**
 * Map a source item to a target item with attributes and relationships.
 * @param {Object} item - The source item to map from
 * @param {Object} itemDef - An object with item definitions
 * @returns {Object} Target item
 */
module.exports = function mapItem (item, itemDef = {}) {
  // Return null if no item
  if (!item) {
    return null
  }

  // Get parts from target defintions
  const type = itemDef.type || 'item'
  const attrDefs = itemDef.attributes
  const transformItem = itemDef.transform
  const filterItem = itemDef.filter

  // Map attributes
  const attributes = {}
  if (attrDefs && typeof attrDefs === 'object') {
    Object.keys(attrDefs).forEach((attrName) => {
      const {path, defaultValue, parse, transform, format} = attrDefs[attrName]
      const value = retrieveFromPath(item, path)

      attributes[attrName] = mapAttribute(value, defaultValue, parse, transform, format)

      if (attributes[attrName] === undefined) {
        attributes[attrName] = null
      }
    })
  }

  // Create target item
  let target = {attributes, type}

  // If target item has id attribute, use it as id for item and delete it
  // Otherwise, generate unique id
  if (attributes.id) {
    target.id = attributes.id
    delete attributes.id
  } else {
    target.id = uuid()
  }

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
