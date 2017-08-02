module.exports = () => ({
  adapters: require('./adapters')(),
  authstrats: require('./authstrats')(),
  formatters: require('./formatters')(),
  workers: require('./workers')()
})
