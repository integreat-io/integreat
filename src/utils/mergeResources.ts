import R = require('ramda')
import { Resources } from '../create'

export default function mergeResources(...resources: Resources[]): Resources {
  return resources.reduce(
    (resources, resource) => R.mergeDeepRight(resources, resource),
    {}
  )
}
