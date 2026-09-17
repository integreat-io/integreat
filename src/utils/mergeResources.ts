import type { Resources } from '../types.js'

function mergeTwoResources(a: Resources, b: Resources): Resources {
  const generateUnique = b.generateUnique ?? a.generateUnique

  return {
    transporters: { ...a.transporters, ...b.transporters },
    handlers: { ...a.handlers, ...b.handlers },
    authenticators: {
      ...a.authenticators,
      ...b.authenticators,
    },
    transformers: { ...a.transformers, ...b.transformers },
    ...(generateUnique && { generateUnique }),
  }
}

/**
 * Merge the given `resources`. When resources have conflicts, the last resource
 * will override the earlier.
 */
export default function mergeResources(...resources: Resources[]): Resources {
  return resources.reduce(mergeTwoResources, {})
}
