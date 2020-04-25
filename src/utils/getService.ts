/* eslint-disable security/detect-object-injection */
import { Dictionary } from '../types'
import { Schema } from '../schema'
import { Service } from '../service/types'

function serviceIdFromSchema(schemas: Dictionary<Schema>, type?: string) {
  const schema = type ? schemas[type] : undefined
  return schema?.service
}

/**
 * Get service from type or service id.
 */
export default function getService(
  schemas?: Dictionary<Schema>,
  services?: Dictionary<Service>
) {
  if (!services) {
    return () => undefined
  }

  return (types?: string | string[], serviceId?: string) => {
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
