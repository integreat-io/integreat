const uuid = require('uuid/v4')
const retrieveFromPath = require('../utils/retrieveFromPath')
const mapAttribute = require('./mapAttribute')

const setFromAttributes = (attr, item, attributes, defaultFn) => {
  if (attributes[attr]) {
    item[attr] = attributes[attr]
    delete attributes[attr]
  } else {
    item[attr] = defaultFn()
  }
}

/**
 * Map a source item to a target item with attributes and relationships.
 * @param {Object} item - The source item to map from
 * @param {Object} itemDef - An object with item definitions
 * @returns {Object} Target item
 */
function mapItem (item, itemDef = {}) {
  // Return null if no item
  if (!item) {
    return null
  }

  // Get parts from target defintions
  const type = itemDef.type || mapItem.defaultType
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
  setFromAttributes('id', target, attributes, () => uuid())

  // createdAt and updatedAt
  setFromAttributes('createdAt', target, attributes, () => Date.now())
  setFromAttributes('updatedAt', target, attributes, () => target.createdAt)

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

// Default type
mapItem.defaultType = 'unset'

module.exports = mapItem
