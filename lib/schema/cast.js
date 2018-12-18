const mapAny = require('map-any')
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

const setIfTruish = (rel, val, prop) => {
  if (val[prop]) {
    rel[prop] = val[prop]
  }
}

const castRel = (type) => (val) => {
  const rel = {
    id: (val.id || val).toString(),
    type
  }

  if (val.attributes || val.relationships) {
    rel.attributes = val.attributes || {}
    rel.relationships = val.relationships || {}
  }

  setIfTruish(rel, val, 'meta')
  setIfTruish(rel, val, 'isNew')
  setIfTruish(rel, val, 'isDeleted')

  return rel
}

const flattenRelArray = (rel) => (Array.isArray(rel.id)) ? rel.id.map((id) => ({ ...rel, id })) : rel
const castRels = (val, type) => (val === null) ? null : mapAny(castRel(type), flattenRelArray(val))

const stripArrayNotation = (type) => (type.endsWith('[]')) ? type.substr(0, type.length - 2) : type

const castRelationships = (dataRels = {}, typeRels, defaults) => {
  return Object.keys(dataRels)
    .reduce((rels, key) => (typeRels[key] && dataRels[key] !== undefined)
      ? { ...rels, [key]: castRels(dataRels[key], stripArrayNotation(typeRels[key].type)) }
      : rels,
    defaults)
}

/**
 * Cast item
 */
function cast ({ id, attributes, relationships, defaultAttrs, defaultRels }) {
  return (data, { onlyMappedValues }) => {
    if (!data) {
      return null
    }

    const attrs = castAttributes(data.attributes, attributes, (onlyMappedValues) ? {} : { ...defaultAttrs })
    if (!onlyMappedValues) {
      setDates(attrs)
    }
    const rels = castRelationships(data.relationships, relationships, (onlyMappedValues) ? {} : { ...defaultRels })
    const castId = data.id || attrs.id || uuid()
    delete attrs.id

    const casted = {
      id: castId,
      type: id,
      attributes: attrs,
      relationships: rels
    }

    if (data.isNew) {
      casted.isNew = true
    }
    if (data.isDeleted) {
      casted.isDeleted = true
    }

    return casted
  }
}

module.exports = cast
