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

const mapAttributes = (item, attrDefs) => {
  const attributes = {}
  if (Array.isArray(attrDefs)) {
    attrDefs.forEach((attrDef) => {
      const {key, path, defaultValue, map} = attrDef
      const value = retrieveFromPath(item, path)
      attributes[key] = mapAttribute(value, defaultValue, map)
    })
  }
  return attributes
}

const createRel = (value, defaultValue, map, type) => ({
  id: mapAttribute(value, defaultValue, map),
  type
})

const mapRelationships = (item, relDefs) => {
  const relationships = {}
  if (Array.isArray(relDefs)) {
    relDefs.forEach((relDef) => {
      const {key, path, defaultValue, map, type} = relDef
      const value = retrieveFromPath(item, path)

      if (Array.isArray(value)) {
        relationships[key] =
          value.map((val) => createRel(val, defaultValue, map, type))
      } else {
        relationships[key] = createRel(value, defaultValue, map, type)
      }
    })
  }
  return relationships
}

/**
 * Map a source item to a target item with attributes and relationships.
 * @param {Object} item - The source item to map from
 * @param {string} type - Item type
 * @param {array} attrDefs - An array with Attribute objects for attributes
 * @param {array} relDefs - An array with Attribute objects for relationships
 * @returns {Object} Target item
 */
function mapItem (item, type = mapItem.defaultType, attrDefs, relDefs) {
  if (!item) {
    return null
  }

  const attributes = mapAttributes(item, attrDefs)
  const relationships = mapRelationships(item, relDefs)
  const target = {type, attributes, relationships}

  setFromAttributes('id', target, attributes, () => uuid())

  setFromAttributes('createdAt', target, attributes, () => new Date())
  setFromAttributes('updatedAt', target, attributes, () => target.createdAt)

  return target
}

// Default type
mapItem.defaultType = 'unset'

module.exports = mapItem
