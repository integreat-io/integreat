const uuid = require('uuid/v4')
const formatValue = require('./formatValue')

const setDates = (attrs) => {
  attrs.createdAt = new Date(attrs.createdAt || attrs.updatedAt || new Date())
  attrs.updatedAt = new Date(attrs.updatedAt || attrs.createdAt)
}

const castAttributes = (dataAttrs = {}, typeAttrs, defaults) => {
  return Object.keys(dataAttrs)
    .reduce((attrs, key) => {
      if (typeAttrs.hasOwnProperty(key)) {
        const value = formatValue(dataAttrs[key], typeAttrs[key])
        if (value !== undefined) {
          attrs[key] = value
        }
      }
      return attrs
    }, defaults)
}

const getRelId = (rel) => (rel.id) ? rel.id : rel.toString()
const castRel = (val, type) => (val === null) ? null : {id: getRelId(val), type}
const castRels = (val, type) => (Array.isArray(val))
  ? val.map(val => castRel(val, type))
  : castRel(val, type)

const castRelationships = (dataRels = {}, typeRels, defaults) => {
  return Object.keys(dataRels)
    .reduce((rels, key) => (typeRels[key] && dataRels[key] !== undefined)
      ? {...rels, [key]: castRels(dataRels[key], typeRels[key].type)}
      : rels
      , defaults)
}

/**
 * Cast item
 */
function cast (data, {id, attributes, relationships, defaultAttrs, defaultRels, useDefaults}) {
  if (!data) {
    return null
  }

  const attrs = castAttributes(data.attributes, attributes, (useDefaults) ? {...defaultAttrs} : {})
  if (useDefaults) {
    setDates(attrs)
  }
  const rels = castRelationships(data.relationships, relationships, (useDefaults) ? {...defaultRels} : {})
  const castId = data.id || attrs.id || uuid()
  delete attrs.id

  return {
    id: castId,
    type: id,
    attributes: attrs,
    relationships: rels
  }
}

module.exports = cast
