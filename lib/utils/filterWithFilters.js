const filterOne = (filter, item) => {
  if (filter && typeof filter === 'function') {
    return filter(item)
  }
  return true
}

/**
 * Filter the item through the given filter pipeline. Will return true if all
 * filters returns true, otherwise false.
 * Will skip any filter that is not a function, and will return true if no
 * valid filter is given.
 * @param {Object} item - The item to filter on
 * @param {Object} filters - An array of filter functions
 * @returns {boolean} True if all filters return true
 */
module.exports = function filterWithFilters (item, filters) {
  if (!filters) {
    return true
  }

  if (Array.isArray(filters)) {
    return filters.every((filter) => filterOne(filter, item))
  } else {
    return filterOne(filters, item)
  }
}
