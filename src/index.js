import * as packageJson from '../package.json'

/**
 * Create a Promise instance with time out 1s. After 1s, the Promise with be rejected anyway
 * @param {Function} resolvePromise The function handles Promise resolve
 * @param {Function} cleanUp The function to be called before timed out
 * @returns {Promise} A Promise instance with time out 1s
 */
const timedOutPromise = (resolvePromise, cleanUp) => {
  return new Promise((resolve, reject) => {
    resolvePromise(resolve)

    setTimeout(() => {
      cleanUp()
      reject(new Error('Timed out.'))
    }, 1000)
  })
}

/**
 * Check if we are under a uoma plugin iframe
 * @returns {boolean} Whether we are under a uoma plugin iframe
 */
const isUoma = () => {
  try {
    return window.parent.isUoma
  } catch {
    return false
  }
}

/**
 * Check if the given permission name is a valid permission name
 * @param {string} name Permission name
 * @returns {boolean} Whether this is a valid permission name
 */
const isValidPermissionName = (name) => {
  if (typeof name !== 'string') {
    return false
  }
  const splitedName = name.split('/')
  if (splitedName.length === 2 & permissions[splitedName[0]]) {
    return permissions[splitedName[0]].includes(splitedName[1])
  }
  return false
}

const permissions = {
  global: [
    'language:read',
    'theme:read',
    'account:read',
    'backend:read',
    'widgets:read',
    'account:write',
    'backend:write',
    'notification:write'
  ],
  clock: [
    'timezone:read',
    'timezone:write'
  ],
  todo: [
    'list:read',
    'list:write'
  ],
  quickLink: [
    'custom:read',
    'custom:write'
  ],
  course: [
    'list:read',
    'list:write'
  ],
  attendance: [
    'absentList:read'
  ],
  calendar: [
    'events:read',
    'view:read',
    'view:write'
  ],
  coursework: [
    'list:read',
    'list:write'
  ],
  quickNote: [
    'list:read',
    'list:write',
    'noteContent:read',
    'noteContent:write',
    'view:read',
    'view:write'
  ],
  inbox: [
    'list:read',
    'mailContent:read',
    'view:read',
    'view:write'
  ],
  gradeSummary: [
    'list:read'
  ],
  plugin: [
    'runningPlugins:read'
  ]
}

const eventList = {
  global: {
    updateLanguage: 'language:read',
    updateTheme: 'theme:read',
    updateAccount: 'account:read',
    updateBackend: 'backend:read',
    updateWidgets: 'widgets:read'
  },
  clock: {
    updateTimezone: 'timezone:read'
  },
  todo: {
    done: 'list:read',
    undone: 'list:read',
    add: 'list:read',
    remove: 'list:read'
  },
  quickLink: {
    addCustomLink: 'custom:read',
    removeCustomLink: 'custom:read'
  },
  course: {
    add: 'list:read',
    remove: 'list:read',
    update: 'list:read'
  },
  attendance: {
    update: 'absentList:read'
  },
  calendar: {
    update: 'events:read'
  },
  coursework: {
    done: 'list:read',
    undone: 'list:read',
    add: 'list:read',
    remove: 'list:read'
  },
  quickNote: {
    add: 'list:read',
    remove: 'list:read'
  },
  inbox: {
    update: 'list:read',
    send: 'view:read'
  },
  gradeSummary: {
    update: 'list:read'
  },
  plugin: {
    updateRunningPlugins: 'runningPlugins:read'
  }
}

const eventCallbackList = {}

export default {
  /**
   * SDK version
   */
  version: packageJson.version,

  /**
   * Initialize the SDK
   * @param {string} pluginId Plug-in name
   * @returns {boolean} `true` if the SDK is initialized successfully
   */
  init (pluginId) {
    // Check arguments
    if (typeof pluginId !== 'string') {
      throw new Error(`Plugin ID should be a string, not ${typeof pluginId}.`)
    }
    if (pluginId.length < 4) {
      throw new Error('Invalid plugin ID.')
    }

    // Check we are under a uoma plugin iframe
    if (window.parent === window || !isUoma()) {
      return false
    }

    // Save plugin name
    window.uomaPluginId = pluginId

    // Add global localstorage listener
    window.addEventListener('storage', (e) => {
      // e.key
      // e.oldValue
      // e.newValue
    })

    return true
  },

  /**
   * Check if we have the permission
   * @param {string} permission Permission name
   * @returns {Promise<boolean>} `true` if we have the permission
   */
  checkPermission (permission) {
    // Check arguments
    if (typeof window.uomaPluginId !== 'string' || window.uomaPluginId.length < 4) {
      return Promise.reject(new Error('Please call uoma.init(pluginId) first.'))
    }
    if (typeof permission !== 'string') {
      return Promise.reject(new Error(`Permission name should be a string, not ${typeof permission}.`))
    }
    if (!isValidPermissionName(permission)) {
      return Promise.reject(new Error(`Invalid permission name ${permission}.`))
    }

    let listener = null

    return timedOutPromise((resolve) => {
      listener = (e) => {
        // Check message response
        if (e.source === window.parent && e.data.action === `checkPermission:${permission}`) {
          resolve(e.data.data)
        }
      }
      window.addEventListener('message', listener)

      // Send message
      window.parent.postMessage({
        action: 'checkPermission',
        id: window.uomaPluginId,
        data: permission
      }, window.location.origin)
    }, () => {
      window.removeEventListener('message', listener)
    })
  },

  /**
   * Add a callback to event listener
   * @param {string} target Event name
   * @param {Function} callback Callback function
   * @returns {Promise<void>} Whether the callback is added
   */
  async on (target, callback) {
    // Check arguments
    if (typeof window.uomaPluginId !== 'string' || window.uomaPluginId.length < 4) {
      return Promise.reject(new Error('Please call uoma.init(pluginId) first.'))
    }
    if (typeof target !== 'string') {
      return Promise.reject(new Error(`Event name should be a string, not ${typeof target}.`))
    }
    if (typeof callback !== 'function') {
      return Promise.reject(new Error(`Event callback should be a function, not ${typeof callback}.`))
    }

    // Check event name
    const splitedTarget = target.split('@')
    if (splitedTarget.length === 2 && eventList[splitedTarget[0]] && eventList[splitedTarget[0]][splitedTarget[1]]) {
      // Check permission
      const result = await this.checkPermission(eventList[splitedTarget[0]][splitedTarget[1]])
      if (!result) {
        throw new Error(`This event needs permission ${eventList[splitedTarget[0]][splitedTarget[1]]}, which this plugin doesn't have.`)
      }

      // Init callback list
      if (!eventCallbackList[splitedTarget[0]]) {
        eventCallbackList[splitedTarget[0]] = {}
      }
      if (!eventCallbackList[splitedTarget[0]][splitedTarget[1]]) {
        eventCallbackList[splitedTarget[0]][splitedTarget[1]] = []
      }

      // Add callback to callback list
      eventCallbackList[splitedTarget[0]][splitedTarget[1]].push(callback)
    }
    return Promise.reject(new Error(`Unknown event ${target}.`))
  },

  /**
   * Remove a callback from a event
   * @param {string} target Event name
   * @param {Function} callback A callback function registered before
   * @returns {Promise<Function>} If resolved, the removed callback function will be returned
   */
  off (target, callback) {
    // Check arguments
    if (typeof window.uomaPluginId !== 'string' || window.uomaPluginId.length < 4) {
      return Promise.reject(new Error('Please call uoma.init(pluginId) first.'))
    }
    if (typeof target !== 'string') {
      return Promise.reject(new Error(`Event name should be a string, not ${typeof target}.`))
    }
    if (typeof callback !== 'function') {
      return Promise.reject(new Error(`Event callback should be a function, not ${typeof callback}.`))
    }

    // Check event name
    const splitedTarget = target.split('@')
    if (splitedTarget.length === 2 && eventList[splitedTarget[0]] && eventList[splitedTarget[0]][splitedTarget[1]]) {
      if (eventCallbackList[splitedTarget[0]] && eventCallbackList[splitedTarget[0]][splitedTarget[1]]) {
        // Looking for the callback
        for (let i = 0; i < eventCallbackList[splitedTarget[0]][splitedTarget[1]].length; i += 1) {
          if (eventCallbackList[splitedTarget[0]][splitedTarget[1]][i] === callback) {
            // Callback found, remove it and return
            eventCallbackList[splitedTarget[0]][splitedTarget[1]].splice(i, 1)
            return Promise.resolve(callback)
          }
        }
        return Promise.reject(new Error('Cannot find callback.'))
      }
      return Promise.reject(new Error('Not callback registered on this event.'))
    }
    return Promise.reject(new Error(`Unknown event ${target}.`))
  },

  /**
   * Get data from uoma
   * @param {string} target Data name
   * @returns {Promise} The requested data
   */
  get (target) {
    if (typeof window.uomaPluginId !== 'string' || window.uomaPluginId.length < 4) {
      return Promise.reject(new Error('Please call uoma.init(pluginId) first.'))
    }
    return Promise.resolve(target)
  },

  /**
   * Set data by given name
   * @param {String} target Data name
   * @param {*} value The value to be set
   * @returns {Promise<boolean>} Whether the value is set successfully
   */
  set (target, value) {
    if (typeof window.uomaPluginId !== 'string' || window.uomaPluginId.length < 4) {
      return Promise.reject(new Error('Please call uoma.init(pluginId) first.'))
    }
    return Promise.resolve(target)
  }
}
