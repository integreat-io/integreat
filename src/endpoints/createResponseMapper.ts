import { mapTransform, set } from 'map-transform'
import { normalizeMapping } from '../mapping/normalize'

function createResponseMapper({ responseMapping }, { transformers } = {}) {
  if (responseMapping) {
    return typeof responseMapping === 'string'
      ? mapTransform([`data.${responseMapping}`, set('data')])
      : mapTransform(['data', normalizeMapping(responseMapping, transformers)])
  }
  return null
}

export default createResponseMapper
