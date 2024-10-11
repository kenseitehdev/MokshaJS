
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

/**
 * Define a custom web component with the specified properties and template.
 * @param {Object} options - The configuration options for the component.
 * @param {string} options.name - The name of the custom element.
 * @param {string} options.template - The HTML template for the component.
 * @param {Function} options.connectedCallback - A callback to be called when the component is connected to the DOM.
 * @param {Object} [options.props={}] - An object representing the properties of the component.
 * @returns {Function} A function that creates an instance of the custom element.
 */
function defineComponent({ name, template, connectedCallback, props = {} }) {
    /**
     * Class representing a custom HTML element.
     * @extends HTMLElement
     */
    class CustomElement extends HTMLElement {
        /**
         * Create a CustomElement instance.
         * @param {Object} store - The store for state management.
         * @param {string} namespace - The namespace for the component.
         * @param {Function} updateCallback - A callback function for updates.
         * @param {Object} methods - Methods associated with the component.
         */
        constructor(store, namespace, updateCallback, methods) {
            super();
            this.props = { ...props };
            this.template = document.createElement("template");
            this.template.innerHTML = template;
            this.namespace = namespace;
            this.store = store;
            this.methods = methods;
            this.updateCallback = updateCallback;
            this.userConnectedCallback = connectedCallback;
            this.state = { updated: false };
            this.lifecycle = {
                created: false,
                mounted: false,
                updated: false,
                destroyed: false
            };
        }

        /**
         * Callback invoked when the element is connected to the DOM.
         */
        connectedCallback() {
            this.lifecycle.created = true;
            this.render();
            if (this.userConnectedCallback) {
                this.userConnectedCallback();
            }
            this.addEventListener('click', this.handleClick);
        }

        /**
         * Callback invoked when the element is disconnected from the DOM.
         */
        disconnectedCallback() {
            this.removeEventListener('click', this.handleClick);
            this.removeEventListener('keyup', this.handleKeyUp);
            if (this.unsubscribe) {
                this.unsubscribe();
            }
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
        }

        /**
         * Determine if the component should re-render based on new properties.
         * @param {Object} newProps - The new properties to compare against.
         * @returns {boolean} True if the component should re-render, false otherwise.
         */
        shouldRender(newProps) {
            for (const key in newProps) {
                if (this.props[key] !== newProps[key]) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Update the component with new properties and re-render if necessary.
         * @param {Object} newProps - The new properties to update the component with.
         */
        update(newProps) {
            if (this.shouldRender(newProps)) {
                this.props = newProps;
                this.render();
                this.lifecycle.updated = true;
            }
        }

        /**
         * Destroy the component and remove it from the DOM.
         */
        destroy() {
            this.remove();
            this.lifecycle.destroyed = true;
            this.disconnectedCallback();
        }

        /**
         * Get the list of observed attributes for the component.
         * @returns {string[]} An array of observed attribute names.
         */
        static get observedAttributes() {
            return Object.keys(props);
        }

        /**
         * Callback invoked when an observed attribute is changed.
         * @param {string} attr - The name of the attribute that changed.
         * @param {string} oldValue - The old value of the attribute.
         * @param {string} newValue - The new value of the attribute.
         */
        attributeChangedCallback(attr, oldValue, newValue) {
            if (oldValue !== newValue) {
                this.updated = false;
                this.props[attr] = newValue;
                this.update(this.props);
            }
        }

        /**
         * Render the component's template into the DOM.
         */
        render() {
            components.push({ id: components.length, component: this });
            const content = this.template.content.cloneNode(true);
            this.replacePlaceholdersInContent(content);
            this.innerHTML = "";
            this.appendChild(content);
            this.lifecycle.mounted = true;
        }

        /**
         * Replace placeholders in the content with actual property values.
         * @param {DocumentFragment} content - The content to process.
         */
        replacePlaceholdersInContent(content) {
            content.querySelectorAll("*").forEach(el => {
                el.innerHTML = el.innerHTML.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
                    return this.getAttribute(p1) || this.props[p1] || "";
                });
            });
        }
    }

    // Define the custom element if it hasn't been defined yet
    if (!customElements.get(name)) {
        customElements.define(name, CustomElement);
    }

    // Return a function that creates an instance of the custom element
    return (props = {}) => {
        const el = document.createElement(name);
        Object.keys(props).forEach(key => el.setAttribute(key, props[key]));
        return el;
    };
}
