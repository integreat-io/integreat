function createError (message, status = 'error') {
  return {
    status,
    error: message
  }
}

export default createError
