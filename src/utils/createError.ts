function createError (message, status = 'error') {
  return {
    status,
    error: message
  }
}

module.exports = createError
