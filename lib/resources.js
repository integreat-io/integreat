module.exports = () => ({
  adapters: require('./adapters')(),
  authstrats: require('./authstrats')(),
  formatters: require('./formatters')(),
  hooks: {},
  transformers: require('./transformers')(),
  workers: require('./workers')()
})
