import type { Middleware } from '../types.js'

export function composeMiddleware(...fns: Middleware[]): Middleware {
  return fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args)),
  )
}
