/**
 * Get service from type or service id.
 * @param {Object} schemas - The schemas
 * @param {Object} services - The services
 * @returns {function} Function to retrieve service from type and service id
 */
function getService (schemas, services) {
  return (type, service) => {
    if (!service && schemas[type]) {
      service = schemas[type].service
    }
    return services[service] || null
  }
}

export default getService
