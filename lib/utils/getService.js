/**
 * Get service from type or service id.
 * @param {Object} datatypes - The datatypes
 * @param {Object} services - The services
 * @returns {function} Function to retrieve service from type and service id
 */
function getService (datatypes, services) {
  return (type, service) => {
    if (!service && datatypes[type]) {
      service = datatypes[type].service
    }
    return services[service] || null
  }
}

module.exports = getService
