import { Dictionary } from '../types'
import { Schema } from '../schema'
import { ObjectWithId } from '../utils/indexUtils'

/**
 * Get service from type or service id.
 * @param schemas - The schemas
 * @param services - The services
 * @returns Function to retrieve service from type and service id
 */
export default function getService(
  schemas?: Dictionary<Schema>,
  services?: Dictionary<ObjectWithId> // TODO: Properly type Service
) {
  if (!services) {
    return () => undefined
  }

  return (type?: string, serviceId?: string) => {
    if (!serviceId && schemas) {
      // eslint-disable-next-line security/detect-object-injection
      const schema = type ? schemas[type] : undefined
      if (schema?.service) {
        serviceId = schema.service
      }
    }
    // eslint-disable-next-line security/detect-object-injection
    return (serviceId && services[serviceId]) || undefined
  }
}
