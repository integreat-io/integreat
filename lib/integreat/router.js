const get = require('./actions/get')
const getAll = require('./actions/getAll')
const setNow = require('./actions/setNow')
const run = require('./actions/run')

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with sources, types, and workers
 * @returns {Promise} Promise of returned data
 */
async function router (action, {sources, types, workers} = {}) {
  if (action) {
    switch (action.type) {
      case 'GET':
        return get(action, {sources, types})
      case 'GET_ALL':
        return getAll(action, {sources, types})
      case 'SET':
      case 'SET_NOW':
        return setNow(action, {sources, types})
      case 'RUN':
        return run(action, {workers})
    }
  }

  return {status: 'noaction'}
}

module.exports = router
