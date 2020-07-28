import R = require('ramda')
import { TransformFunction, Transporter } from '../types'

export interface Resources {
  transporters?: Record<string, Transporter>
  transformers?: Record<string, TransformFunction>
}

export default function mergeResources(...resources: Resources[]): Resources {
  return resources.reduce(
    (resources, resource) => R.mergeDeepRight(resources, resource),
    {}
  )
}
