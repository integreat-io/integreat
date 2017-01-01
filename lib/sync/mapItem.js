const uuid = require('uuid/v4')
const retrieveFromPath = require('../utils/retrieveFromPath')
const mapAttribute = require('./mapAttribute')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')

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
 * @param {string} type - Item type
 * @param {Object} attrDefs - An object with attribute definitions
 * @param {array} mappers - An array of mappers (mapper functions or mapper
 * objects)
 * @param {Object} filters - An array of filters
 * @returns {Object} Target item
 */
function mapItem (item, type = mapItem.defaultType, attrDefs, mappers, filters) {
  // Return null if no item
  if (!item) {
    return null
  }

  // Map attributes
  const attributes = {}
  if (attrDefs && typeof attrDefs === 'object') {
    Object.keys(attrDefs).forEach((attrName) => {
      const {path, defaultValue, map} = attrDefs[attrName]
      const value = retrieveFromPath(item, path)

      attributes[attrName] = mapAttribute(value, defaultValue, map)

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

  // Map target item
  target = mapWithMappers(target, mappers)

  // Set target to null if any filter function returns false
  if (!filterWithFilters(target, filters)) {
    target = null
  }

  // Return target item
  return target
}

// Default type
mapItem.defaultType = 'unset'

module.exports = mapItem
