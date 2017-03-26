const flatten = (arrs) => arrs.reduce((result, arr) => result.concat(arr), [])

/** Class representing a source */
class Source {
  /**
   * Create a source.
   * @param {string} id - The id of the source
   * @param {Object} adapter - An adapter for this source
   */
  constructor (id, adapter = null) {
    this._id = id
    this._adapter = adapter
    this._items = []

    this.fetch = {
      endpoint: null,
      changelog: null,
      auth: null
    }

    this.send = {
      endpoint: null,
      auth: null,
      map: []
    }

    this.schedule = null
    this.allowRelay = false
    this.allowPush = false
    this.nextSync = null
  }

  /** Return id */
  get id () {
    return this._id
  }

  /** Return adapter */
  get adapter () {
    return this._adapter
  }

  /** Return items */
  get items () {
    return this._items
  }

  /**
   * Sets the given next sync. If none is given as an attribute,
   * calculate next from schedule.
   * @param {integer} nextSync - Next sync time stamp
   * @returns {integer} Next sync time stamp
   */
  setNextSync (nextSync) {
    if (nextSync) {
      // Set given nextSync
      this.nextSync = nextSync
    } else if (!this.schedule) {
      // Set to null when no schedule
      this.nextSync = null
    } else {
      // Set nextSync from schedule, or now if nextSync is in the past
      const fromSchedule = (this.nextSync) ? this.nextSync + (this.schedule * 1000) : 0
      this.nextSync = Math.max(fromSchedule, Date.now())
    }

    // Return next sync time
    return this.nextSync
  }

  /**
   * Will normalize, map, and filter data from a source with the given itemDef.
   * If no itemDef is given, all itemDefs of this Source will be used.
   * @returns {Promise} Promise for array of items
   */
  async normalizeMapFilter (data, itemDef = null) {
    if (!this.adapter || !data) {
      return []
    }

    const itemDefs = [].concat(itemDef || this.items)

    const processOne = async (def) => {
      const items = await this.adapter.normalize(data, def.path)
      return items
        .map((item) => def.mapItem(item))
        .filter((item) => def.filterItem(item))
    }

    const itemArrays = await Promise.all(itemDefs.map(processOne))
    return flatten(itemArrays)
  }

  /**
   * Fetch and return source items.
   * Will retrieve from source, do the necessary mapping and filtering,
   * and return the results as an array of items.
   * @returns {Promise} Promise for array of items
   */
  async fetchItems () {
    if (!this.adapter || !this.fetch.endpoint) {
      return []
    }

    const data = await this.adapter.retrieve(this.fetch.endpoint, this.fetch.auth)
    return this.normalizeMapFilter(data)
  }
}

module.exports = Source
