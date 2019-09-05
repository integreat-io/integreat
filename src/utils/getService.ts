/**
 * Get service from type or service id.
 * @param schemas - The schemas
 * @param services - The services
 * @returns Function to retrieve service from type and service id
 */
function getService(schemas, services) {
  return (type: string, serviceId: string) => {
    if (!serviceId) {
      // eslint-disable-next-line security/detect-object-injection
      const service = schemas[type]
      serviceId = service ? service.service : undefined
    }
    // eslint-disable-next-line security/detect-object-injection
    return services[serviceId] || null
  }
}

export default getService
