class Sources extends Map {
  /**
   * Create the Sources object
   */
  constructor () {
    super()
    this._types = new Map()
  }

  get types () {
    return this._types
  }

  /**
   * Get a source from type.
   * @param {string} type - The type to get a source from
   * @returns {Source} The source mapped to the given type
   */
  getFromType (type) {
    const id = this.types.get(type)
    return this.get(id)
  }
}

module.exports = Sources
