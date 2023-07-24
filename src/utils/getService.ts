/* eslint-disable security/detect-object-injection */
import type Schema from '../schema/Schema.js'
import type Service from '../service/Service.js'

function serviceIdFromSchema(schemas: Record<string, Schema>, type?: string) {
  const schema = type ? schemas[type] : undefined
  return schema?.service
}

/**
 * Get service from type or service id.
 */
export default function getService(
  schemas?: Record<string, Schema>,
  services?: Record<string, Service>
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
    return (serviceId && services[serviceId]) || undefined
  }
}
