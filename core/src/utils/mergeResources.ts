import R = require('ramda')
import { TransformFunction, Transporter } from '../types'

export interface Resources {
  transporters?: Record<string, Transporter>
  transformers?: Record<string, TransformFunction>
}

export default function mergeResources(...resources: Resources[]) {
  return resources.reduce(
    (resources, external) => R.mergeDeepRight(resources, external),
    {} as Resources
  )
}
