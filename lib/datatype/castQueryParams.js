const getField = require('../utils/getField')

/**
 * Cast query params according to type
 */
function castQueryParams (relId, data, {relationships}) {
  const relationship = relationships[relId]

  return Object.keys(relationship.query)
    .reduce((params, key) => {
      const value = getField(data, relationship.query[key])
      if (value === undefined) {
        throw new TypeError('Missing value for query param')
      }
      return {...params, [key]: value}
    }, {})
}

module.exports = castQueryParams
