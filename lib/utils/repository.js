module.exports = {
  /**
   * Return the value of the given key in the rep
   * @param {Map} rep - The Map object to get values from
   * @param {string} key - Key to get value of
   * @returns {Object} Value
   */
  get (rep, key) {
    const ret = rep.get(key)
    if (ret === undefined) {
      return null
    }
    return ret
  },

  /**
   * Set the value of the given key in the rep
   * @param {Map} rep - The Map object to set values in
   * @param {string} key - Key to set value of
   * @param {Object} value - Value to set
   * @returns {void}
   */
  set (rep, key, value) {
    if (key) {
      rep.set(key, value)
    }
  },

  /**
   * Remove a key and its value from the rep
   * @param {Map} rep - The Map object to remove key from
   * @param {string} key - Key to remove
   * @returns {void}
   */
  remove (rep, key) {
    rep.delete(key)
  }
}
