import type { Resources } from '../create.js'

export default function mergeResources(...resources: Resources[]): Resources {
  return resources.reduce(
    (resources, resource) => ({
      transporters: { ...resources.transporters, ...resource.transporters },
      handlers: { ...resources.handlers, ...resource.handlers },
      authenticators: {
        ...resources.authenticators,
        ...resource.authenticators,
      },
      transformers: { ...resources.transformers, ...resource.transformers },
    }),
    {}
  )
}
