/** Class representing a source */
class Source {
  /**
   * Create a source.
   * @param {string} id - The id of the source
   */
  constructor (id) {
    this.id = id
    this.adapter = null

    this.fetch = {
      endpoint: null,
      changelog: null,
      path: null,
      auth: null,
      map: [],
      filter: []
    }

    this.send = {
      endpoint: null,
      auth: null,
      map: []
    }

    this.attributes = []
    this.relationships = []
    this.item = {
      type: null,
      map: [],
      filter: []
    }

    this.schedule = null
    this.allowRelay = false
    this.allowPush = false
    this.nextSync = null
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
   * Fetch and return source items.
   * Will retrieve from source, do the necessary mapping and filtering,
   * and return the results as an array of items.
   * @returns {Promise} Promise for array of items
   */
  fetchItems () {
    if (this.adapter && this.fetch.endpoint) {
      return this.adapter.retrieve(this.fetch.endpoint)
        .then((source) => this.adapter.normalize(source, this.item.path)
          .then((items) => items.map((item) => this.item.mapItem(item)))
          .then((items) => items.filter((item) => this.item.filterItem(item)))
        )
    } else {
      return Promise.resolve([])
    }
  }
}

module.exports = Source
