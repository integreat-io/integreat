module.exports = {
  id: 'article',
  source: 'nytimes',
  attributes: {
    title: 'string',
    abstract: 'string',
    text: {type: 'string', default: null},
    url: 'string',
    byline: 'string'
  }
}
