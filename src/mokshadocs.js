
let components = [];

class Batch {
    constructor() {
        /** @property {Function[]} queue - An array to hold update functions. */
        this.queue = [];
        /** @property {boolean} isFlushing - A flag to indicate if the batch is currently flushing. */
        this.isFlushing = false;
    }

    /**
     * Adds an update function to the queue and triggers the flush process.
     * @param {Function} updateFunction - The function to add to the queue.
     */
    add(updateFunction) {
        this.queue.push(updateFunction);
        this.flush();
    }

    /**
     * Executes all update functions in the queue.
     * This method is called on the next animation frame.
     */
    flush() {
        if (this.isFlushing) return; 
        this.isFlushing = true;
        requestAnimationFrame(() => {
            this.queue.forEach(updateFunction => updateFunction());
            this.queue = []; 
            this.isFlushing = false;
        });
    }
}

class Reactive {
    /**
     * Creates a reactive state with subscribers for notifications.
     * @param {Object} initialState - The initial state to set.
     */
    constructor(initialState) {
        /** @property {Proxy} state - The reactive state wrapped in a Proxy. */
        this.state = this.createReactiveState(initialState);
        /** @property {Set<Function>} subscribers - A set of subscriber callbacks. */
        this.subscribers = new Set();
    }

    /**
     * Creates a reactive state using a Proxy.
     * @param {Object} state - The initial state object.
     * @returns {Proxy} - A Proxy object that listens for changes.
     */
    createReactiveState(state) {
        const self = this;
        return new Proxy(state, {
            set(target, property, value) {
                target[property] = value;
                self.notify(); // Notify subscribers on state change
                return true;
            }
        });
    }

    /**
     * Subscribes a callback to be notified on state changes.
     * @param {Function} callback - The callback to add as a subscriber.
     */
    subscribe(callback) {
        this.subscribers.add(callback);
    }

    /**
     * Notifies all subscribers with the current state.
     */
    notify() {
        this.subscribers.forEach(callback => callback(this.state));
    }
}

class Store {
    /**
     * Creates a store with initial state and manages namespaces.
     * @param {Object} [initialState={}] - The initial state of the store.
     */
    constructor(initialState = {}) {
        /** @property {Object} state - The current state of the store. */
        this.state = this._loadState() || initialState;
        /** @property {Object} listeners - An object to hold listeners for each namespace. */
        this.listeners = {};
        /** @property {Batch} batch - An instance of the Batch class for batching updates. */
        this.batch = new Batch();
        /** @property {Object} derivedState - An object to hold derived states. */
        this.derivedState = {}; // Updated from derived
    }

    /**
     * Creates a namespace within the store with initial state.
     * @param {string} namespace - The namespace to create.
     * @param {Object} initialState - The initial state for the namespace.
     */
    createNamespace(namespace, initialState) {
        if (!this.state[namespace]) {
            this.state[namespace] = initialState;
            this.listeners[namespace] = [];
            this._saveState();
        } else {
            Error.logWarning(`Namespace ${namespace} already exists.`);
        }
    }

    /**
     * Subscribes a listener to a specific namespace.
     * @param {string} namespace - The namespace to subscribe to.
     * @param {Function} listener - The listener function to be called on state changes.
     * @returns {Function} - A function to unsubscribe the listener.
     * @throws {Error} - If the namespace is not found.
     */
    subscribe(namespace, listener) {
        if (!this.listeners[namespace]) {
            throw new Error(`Namespace ${namespace} not found.`);
        }
        this.listeners[namespace].push(listener);
        return () => {
            this.listeners[namespace] = this.listeners[namespace].filter(l => l !== listener);
        };
    }

    /**
     * Derives a new state based on an existing namespace's state.
     * @param {string} namespace - The namespace to derive from.
     * @param {Function} deriveFunction - The function to derive the new state.
     * @throws {Error} - If the namespace is not found.
     */
    derive(namespace, deriveFunction) {
        if (!this.state[namespace]) {
            throw new Error(`Namespace ${namespace} not found.`);
        }
        this.derivedState[namespace] = deriveFunction(this.state[namespace]);
        this.subscribe(namespace, () => {
            this.derivedState[namespace] = deriveFunction(this.state[namespace]);
        });
    }

    /**
     * Gets the derived state for a specific namespace.
     * @param {string} namespace - The namespace to get the derived state from.
     * @returns {Object} - The derived state of the namespace.
     */
    getDerived(namespace) {
        return this.derivedState[namespace];
    }

    /**
     * Sets the state for a specific namespace.
     * @param {string} namespace - The namespace to update.
     * @param {Object} newState - The new state to set.
     * @throws {Error} - If the namespace is not found.
     */
    setState(namespace, newState) {
        if (!this.state[namespace]) {
            throw new Error(`Namespace ${namespace} not found.`);
        }
        this.batch.add(() => {
            const prevState = this.state[namespace];
            const updatedState = { ...prevState, ...newState };

            if (!this._isEqual(prevState, updatedState)) {
                this.state[namespace] = updatedState;
                this._notifyListeners(namespace);
                this._saveState();
            }
        });
    }

    /**
     * Gets the current state for a specific namespace.
     * @param {string} namespace - The namespace to get the state from.
     * @returns {Object} - The current state of the namespace.
     */
    getState(namespace) {
        return this.state[namespace];
    }

    /**
     * Notifies all listeners for a specific namespace of a state change.
     * @param {string} namespace - The namespace to notify listeners for.
     */
    _notifyListeners(namespace) {
        const namespaceListeners = this.listeners[namespace];
        if (namespaceListeners) {
            this.batch.add(() => {
                namespaceListeners.forEach(listener => listener(this.state[namespace]));
            });
        }
    }

    /**
     * Compares two states for equality.
     * @param {Object} prevState - The previous state.
     * @param {Object} newState - The new state to compare.
     * @returns {boolean} - True if the states are equal, otherwise false.
     */
    _isEqual(prevState, newState) {
        return JSON.stringify(prevState) === JSON.stringify(newState);
    }

    /**
     * Saves the current state to local storage.
     */
    _saveState() {
        localStorage.setItem('storeState', JSON.stringify(this.state));
    }

    /**
     * Loads the saved state from local storage.
     * @returns {Object|null} - The loaded state or null if not found.
     */
    _loadState() {
        const savedState = localStorage.getItem('storeState');
        return savedState ? JSON.parse(savedState) : null;
    }
}

class EventBus {
    constructor() {
        /** @property {Object} listeners - An object to hold event listeners. */
        this.listeners = {};
    }

    /**
     * Registers a listener for a specific event.
     * @param {string} event - The name of the event.
     * @param {Function} listener - The listener function to execute when the event is emitted.
     */
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    /**
     * Emits an event, triggering all registered listeners.
     * @param {string} event - The name of the event to emit.
     * @param {...any} args - Arguments to pass to the listener functions.
     */
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }

    /**
     * Unregisters a listener for a specific event.
     * @param {string} event - The name of the event.
     * @param {Function} listener - The listener function to remove.
     */
    off(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }

    /**
     * Clears all listeners for a specific event.
     * @param {string} event - The name of the event to clear.
     */
    clear(event) {
        if (this.listeners[event]) {
            delete this.listeners[event];
        }
    }
}

class Error {
    /**
     * Logs a warning message to the console.
     * @param {string} warning - The warning message to log.
     */
    static logWarning(warning) {
        Error.logError("Warning:", warning);
    }

    /**
     * Logs an error message to the console.
     * @param {...any} messages - Messages to log as errors.
     */
    static logError(...messages) {
        console.error(...messages);
    }
}

// Example Usage:
// const myStore = new Store({ user: { name: 'John', age: 30 } });
// myStore.subscribe('user', (state) => console.log('User state changed:', state));
