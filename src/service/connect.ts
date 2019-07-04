const handleConnection = (connection, serviceId, setConnection) => {
  switch (connection.status) {
    case 'ok':
      setConnection(connection)
      return { connection }
    case 'noaction':
      setConnection(null)
      return { connection: null }
    default:
      setConnection(null)
      return {
        response: {
          status: 'error',
          error: `Could not connect to service '${serviceId}': ${connection.error}`
        }
      }
  }
}

function connect ({ adapter, serviceOptions, serviceId, setConnection = () => {} }) {
  return async ({ authentication, connection, response }) => {
    if (adapter && adapter.connect && (!response || response.status === 'ok')) {
      const nextConnection = await adapter.connect(serviceOptions, authentication, connection)

      if (nextConnection) {
        if (nextConnection === connection) {
          return { connection }
        }
        return handleConnection(nextConnection, serviceId, setConnection)
      }
    }

    return {}
  }
}

module.exports = connect
