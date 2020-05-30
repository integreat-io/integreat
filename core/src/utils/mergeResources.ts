import R = require('ramda')
import { Dictionary, TransformFunction } from '../types'
import { Adapter } from '../service/types'

export interface Resources {
  adapters?: Dictionary<Adapter>
  transformers?: Dictionary<TransformFunction>
}

export default function mergeResources(...resources: Resources[]) {
  return resources.reduce(
    (resources, external) => R.mergeDeepRight(resources, external),
    {} as Resources
  )
}
