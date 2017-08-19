const getSource = require('../utils/getSource')
const nextSchedule = require('../utils/nextSchedule')

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with actions, datatypes, sources, workers, dispatch, and queue
 * @returns {Promise} Promise of returned data
 */
async function router (action, {actions, datatypes, sources, workers, dispatch, queue} = {}) {
  if (action && actions) {
    const handler = actions[action.type]

    if (typeof handler === 'function') {
      const result = await handler(action.payload, {
        datatypes,
        sources,
        workers,
        dispatch,
        queue,
        getSource: getSource(datatypes, sources)
      })

      if (action.schedule && typeof queue === 'function') {
        const nextTime = nextSchedule(action.schedule)
        if (nextTime) {
          queue(action, nextTime)
        }
      }

      return result
    }
  }

  return {status: 'noaction'}
}

module.exports = router
