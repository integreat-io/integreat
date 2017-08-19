module.exports = () => ({
  adapters: require('./adapters')(),
  authstrats: require('./authstrats')(),
  transformers: require('./transformers')(),
  formatters: require('./formatters')(),
  workers: require('./workers')()
})
