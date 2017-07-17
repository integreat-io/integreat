// Get an api key from http://developer.nytimes.com/signup

module.exports = {
  id: 'nytimes',
  adapter: 'json',
  baseUri: 'http://api.nytimes.com/svc/',
  endpoints: {
    'all': {
      uri: `topstories/v2/technology.json?api-key=${process.env.NYTIMES_API_KEY}`,
      path: 'results[]'
    }
  },
  mappings: {
    article: {
      attributes: {
        id: {path: 'url'},
        title: {},
        abstract: {},
        createdAt: {path: 'created_date'},
        updatedAt: {path: 'updated_date'},
        url: {},
        byline: {}
      }
    }
  }
}
