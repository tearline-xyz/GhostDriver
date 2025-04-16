import { createMachine, createActor } from 'xstate';

export enum AuthStatus {
  NONE = 'none',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum AuthEventType {
  LOGIN = 'LOGIN',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_ERROR = 'LOGIN_ERROR',
  LOGOUT = 'LOGOUT',
}

export type AuthEvent =
  | { type: AuthEventType.LOGIN }
  | { type: AuthEventType.LOGIN_SUCCESS }
  | { type: AuthEventType.LOGIN_ERROR }
  | { type: AuthEventType.LOGOUT };

export interface AuthInfo {
  data: TokenData
  // NOTE: Do not use expire below as it's not always available(e.g. null), use data.expired instead
  expire: number | null
}

export interface TokenData {
  userId?: string
  email?: string
  authId?: string
  // NOTE: `expired` is a Unix timestamp (i.e. the number of seconds since UTC on January 1, 1970). 1745984721 stands for `Wed Apr 30 11:45:21 CST 2025`
  expired?: number
  isNew?: boolean
  isActive?: boolean
}

export interface UserDisplayData {
  userId?: string
  email?: string
  isActive?: boolean
}

export interface AuthMessage {
  type: AuthMessageType.LOGIN | AuthMessageType.LOGOUT | AuthMessageType.LOGIN_STATE_CHANGED | AuthMessageType.LOGOUT_STATE_CHANGED
  data?: string
  timestamp?: number
}

export enum AuthMessageType {
  LOGIN_STATE_CHANGED = 'LOGIN_STATE_CHANGED',
  LOGOUT_STATE_CHANGED = 'LOGOUT_STATE_CHANGED',
  INIT_LOGIN = 'INIT_LOGIN',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

const authStateMachine = createMachine({
  id: 'auth',
  initial: AuthStatus.NONE,
  context: {},
  types: {
    events: {} as AuthEvent,
    context: {} as Record<string, never>,
  },
  states: {
    [AuthStatus.NONE]: {
      on: {
        [AuthEventType.LOGIN]: AuthStatus.PENDING,
        [AuthEventType.LOGIN_SUCCESS]: AuthStatus.SUCCESS,
      },
    },
    [AuthStatus.PENDING]: {
      on: {
        [AuthEventType.LOGIN_SUCCESS]: AuthStatus.SUCCESS,
        [AuthEventType.LOGIN_ERROR]: AuthStatus.ERROR,
      },
    },
    [AuthStatus.SUCCESS]: {
      on: {
        [AuthEventType.LOGOUT]: AuthStatus.NONE,
      },
    },
    [AuthStatus.ERROR]: {
      on: {
        [AuthEventType.LOGIN]: AuthStatus.PENDING,
        [AuthEventType.LOGOUT]: AuthStatus.NONE,
      },
    },
  },
});

export const authStateMachineActor = createActor(authStateMachine).start();
