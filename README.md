# MokshaJS
ultra lightweight, robust frontend micro- library/framework
# Documentation

## `Batch` Class
A utility class to manage a batch of functions and execute them using the browser's `requestAnimationFrame`.

### Methods:
- **`add(updateFunction)`**: Adds a new function to the queue and triggers a flush if it's not already flushing.
- **`flush()`**: Flushes the queue by running all stored functions in `requestAnimationFrame`. Avoids redundant flushing.

---

## `Reactive` Class
A class that wraps state and provides a reactive system that triggers updates when the state changes.

### Constructor:
- **`constructor(initialState)`**: Takes an initial state and converts it into a reactive state.

### Methods:
- **`createReactiveState(state)`**: Converts an object into a reactive Proxy.
- **`subscribe(callback)`**: Adds a callback that will be triggered when the state changes.
- **`notify()`**: Notifies all subscribers of the state change.

---

## `Store` Class
Manages application state with support for namespaces and derived state. Allows batching of state updates.

### Constructor:
- **`constructor(initialState = {})`**: Initializes store state and listeners.
  
### Methods:
- **`createNamespace(namespace, initialState)`**: Creates a new namespace with a given initial state.
- **`subscribe(namespace, listener)`**: Subscribes a listener to changes in a given namespace.
- **`derive(namespace, deriveFunction)`**: Creates derived state for a namespace.
- **`getDerived(namespace)`**: Retrieves the derived state of a namespace.
- **`setState(namespace, newState)`**: Sets a new state for the given namespace and triggers listeners if the state has changed.
- **`getState(namespace)`**: Returns the state of the given namespace.

---

## `EventBus` Class
A simple pub-sub system to emit and listen to events.

### Methods:
- **`on(event, listener)`**: Registers a listener for a given event.
- **`emit(event, ...args)`**: Emits an event with arguments to all registered listeners.
- **`off(event, listener)`**: Removes a specific listener from an event.
- **`clear(event)`**: Clears all listeners from an event.

---

## `Error` Static Class
A utility class for logging and handling errors.

### Methods:
- **`logWarning(warning)`**: Logs a warning.
- **`logError(error)`**: Logs an error.
- **`handler(error)`**: Handles errors and logs them.

---

## `defineComponent` Function
Creates a custom web component that binds to a store's namespace and renders a template.

### Arguments:
- **`{ name, template, connectedCallback, props = {} }`**: An object defining the component name, template, lifecycle callbacks, and props.

### Returns:
- A function that creates the custom element.

### Class: `CustomElement`
Represents the custom element created by `defineComponent`.

#### Methods:
- **`connectedCallback()`**: Lifecycle method that is triggered when the component is attached to the DOM.
- **`disconnectedCallback()`**: Lifecycle method triggered when the component is detached from the DOM.
- **`shouldRender(newProps)`**: Determines whether the component should re-render.
- **`update(newProps)`**: Updates the component's properties and triggers a re-render if necessary.
- **`render()`**: Renders the component's template and replaces placeholders with property values.

---

## `Selector` Class
A utility class to perform various DOM manipulations.

### Constructor:
- **`constructor(selector, option = "")`**: Initializes the selector with a CSS selector and an optional parameter.

### Methods:
- **`css(styles)`**: Applies a set of CSS styles to the selected elements.
- **`text(content)`**: Sets the text content of the selected elements.
- **`attributes(action, key, value)`**: Gets or sets an attribute on the selected elements.
- **`value(action, val)`**: Gets or sets the value of the selected input elements.
- **`children()`**: Gets the child elements of the selected elements.
- **`index()`**: Returns the index of the selected elements within their parent.
- **`classList(action, classes)`**: Adds, removes, or toggles class names on the selected elements.
- **`appendChild(childElement)`**: Appends a child element to the selected elements.
- **`on(event, callback)`**: Adds an event listener to the selected elements.

---

## Utility Functions

### `throttle(func, limit)`
Creates a throttled version of a function that will only be called once every `limit` milliseconds.

### `debounce(func, wait)`
Creates a debounced version of a function that will only be called after `wait` milliseconds have passed since the last call.

---

## `VNode` Class
Represents a virtual DOM node for diffing and patching.

### Constructor:
- **`constructor(tag, props = {}, children = [], key = null)`**: Creates a virtual node with a tag, props, children, and an optional key.

---

## Diffing and Patching

### `diff(oldVNode, newVNode)`
Computes the differences between two virtual nodes and returns the patches needed.

### `patchChildren(parentEl, oldChildren, newChildren)`
Applies patches to the child elements of a parent element based on differences in the virtual DOM.

---

## Global Object: `$`
A utility object for managing global application state, components, and rendering.

### Methods:
- **`init(mountSelector, callback)`**: Initializes the application and mounts the virtual DOM to a given selector.
- **`render(mountPoint)`**: Renders the virtual DOM to a mount point.
- **`updateVNode(newVNode)`**: Updates the virtual DOM with new changes.
- **`registerComponent(name, component)`**: Registers a new component.
- **`updateGlobalState(newState)`**: Updates the global state and triggers re-renders for all components.
