import { Action, Response } from '../types'

// TODO: This is the most correct typing, but how to open for cases where we
// listen for non-actions and returns other types of objects?
export interface JobHandler {
  (data: Action): Promise<Response>
}

export interface Queue<Q = Record<string, unknown>> {
  queue: Q
  namespace: string

  push: (
    payload: Action,
    timestamp?: number,
    id?: string
  ) => Promise<string | null>

  subscribe: (handler: JobHandler) => Promise<unknown>

  unsubscribe: (handle: unknown) => Promise<void>

  clean: (ms: number) => Promise<unknown>

  flush: () => Promise<unknown[]>

  flushScheduled: () => Promise<unknown>
}

export interface ScheduleObject {
  schedules?: Record<string, unknown>[]
  exceptions?: Record<string, unknown>[]
  error?: number
}

export interface ScheduleDef {
  id?: string
  schedule:
    | string
    | Record<string, unknown>
    | Record<string, unknown>[]
    | ScheduleObject
    | null
  action: Action
}
