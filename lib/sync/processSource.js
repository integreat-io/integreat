const debug = require('debug')('great')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {Object} source - Source object
 * @param {function} dispatch - Function for dispatching an action
 * @returns {Promise} Promise for array of items
 */
async function processSource (source, dispatch) {
  if (!source) {
    debug('processSource called without a valid source')
    return Promise.reject(new Error('No valid source definition'))
  }

  // Fetch items from source
  debug('Fetching for source `%s`', source.id)
  const items = await source.fetchItems(source.fetch.endpoint)
  debug('Fetched %d items for source `%s`', items.length, source.id)

  if (typeof dispatch === 'function') {
    debug('Storing items for source `%s`', source.id)
    await Promise.all(items.map((item) => dispatch({type: 'SET', payload: item})))
  }

  return items
}

module.exports = processSource
