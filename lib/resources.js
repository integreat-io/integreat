module.exports = () => ({
  adapters: require('./adapters')(),
  authstrats: require('./authstrats')(),
  formatters: require('./formatters')(),
  transformers: require('./transformers')()
})
