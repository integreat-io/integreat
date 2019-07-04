import { mapTransform, set } from 'map-transform'
import { normalizeMappingWithSwitchedTransforms } from '../mapping/normalize'

function createRequestMapper({ requestMapping }, { transformers } = {}) {
  if (!requestMapping) {
    return null
  }
  return typeof requestMapping === 'string'
    ? mapTransform(['data', set(requestMapping)])
    : mapTransform(
        normalizeMappingWithSwitchedTransforms(requestMapping, transformers)
      )
}

export default createRequestMapper
