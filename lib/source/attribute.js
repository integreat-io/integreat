class Attribute {
  constructor (key, type, path, defaultValue) {
    this.key = key || null
    this.type = type || 'string'
    this.path = path || null
    this.defaultValue = (defaultValue !== undefined) ? defaultValue : null
    this.map = []
  }
}

module.exports = Attribute
