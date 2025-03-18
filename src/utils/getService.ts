import type Schema from '../schema/Schema.js'
import type Service from '../service/Service.js'

function serviceIdFromSchema(schemas: Map<string, Schema>, type?: string) {
  const schema = type ? schemas.get(type) : undefined
  return schema?.service
}

/**
 * Get service from type or service id.
 */
export default function getService(
  schemas?: Map<string, Schema>,
  services?: Record<string, Service>,
): (types?: string | string[], serviceId?: string) => Service | undefined {
  if (!services) {
    return () => undefined
  }

  return (types, serviceId) => {
    if (!serviceId && schemas && types) {
      if (Array.isArray(types)) {
        for (const type of types) {
          serviceId = serviceIdFromSchema(schemas, type)
          if (serviceId) {
            break
          }
        }
      } else {
        serviceId = serviceIdFromSchema(schemas, types)
      }
    }
    // eslint-disable-next-line security/detect-object-injection
    return (serviceId && services[serviceId]) || undefined
  }
}
