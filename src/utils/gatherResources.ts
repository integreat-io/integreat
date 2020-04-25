import { Dictionary } from '../types'

export default function gatherResources<T = unknown>(
  resources: string[],
  dir: string
) {
  return (...ids: string[]): Dictionary<T> => {
    if (ids.length === 0) {
      ids = resources
    }

    // eslint-disable-next-line security/detect-non-literal-require
    const requireResource = (id: string) => require(`${dir}/${id}`).default

    return ids.reduce(
      (obj, id) =>
        resources.includes(id) ? { ...obj, [id]: requireResource(id) } : obj,
      {}
    )
  }
}
