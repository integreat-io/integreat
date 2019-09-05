/**
 * Prepare pipeline by replacing keys with functions or function objects from
 * the collection object, and remove anything that is not functions or function
 * objects.
 * @param pipeline - The pipeline definition
 * @param collection - Object with pipeline functions
 * @returns Prepared pipeline
 */
export function preparePipeline(pipeline, collection = {}) {
  pipeline = [].concat(pipeline)

  const replaceWithFunction = (key?: string) =>
    typeof key === 'string' ? collection[key] : key // eslint-disable-line security/detect-object-injection
  const isFunctionOrObject = (obj?: () => unknown | object) =>
    obj && ['function', 'object'].includes(typeof obj)

  return pipeline.map(replaceWithFunction).filter(isFunctionOrObject)
}

/**
 * Prepare reverse pipeline by either running the `revPipeline` through the
 * regular preparePipeline() or – if `revPipeline` is not set - pick `.rev()`
 * functions from the `fwdPipeline`.
 * @param} revPipeline - The reverse pipeline definition or undefined
 * @param fwdPipeline - A pipeline to pick `.rev()` from (already prepared)
 * @param collection - Object with pipeline functions
 * @returns Prepared reverse pipeline
 */
export function prepareRevPipeline(revPipeline, fwdPipeline, collection) {
  return revPipeline
    ? preparePipeline(revPipeline, collection)
    : fwdPipeline.map(fn => (fn.rev ? fn.rev : null)).filter(Boolean)
}
