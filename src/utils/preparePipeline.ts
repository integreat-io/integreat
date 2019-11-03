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
