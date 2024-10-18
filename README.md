# MokshaJS Documentation

## Overview
MokshaJS is an ultra-lightweight frontend library/framework that provides tools for building reactive applications. This documentation covers the main classes and functions included in the library.

## Table of Contents
- [Batch](#batch)
- [Reactive](#reactive)
- [Store](#store)
- [EventBus](#eventbus)
- [Error](#error)
- [Component Management](#component-management)
- [Selector](#selector)
- [VNode](#vnode)
- [Utilities](#utilities)
- [Platform Detection](#platform-detection)
- [Global Methods](#global-methods)

---

## Batch

### Description
The `Batch` class manages a set of update functions and flushes them in a batched manner to optimize performance.

### Methods
- **constructor()**: Initializes the batch with an empty queue and state variables.
- **add(updateFunction)**: Adds an update function to the batch and schedules a flush.
- **scheduleFlush()**: Schedules the flush operation if not already flushing.
- **flush()**: Executes all queued update functions in the next animation frame.

---

## Reactive

### Description
The `Reactive` class allows for the creation of reactive states that notify subscribers upon changes.

### Methods
- **constructor()**: Initializes the reactive instance with an empty set of subscribers.
- **subscribe(callback)**: Adds a callback to the subscribers list.
- **unsubscribe(callback)**: Removes a callback from the subscribers list.
- **notify()**: Notifies all subscribers to execute their callbacks.
- **createReactiveState(initialState)**: Creates a reactive state using a proxy to track changes.

---

## Store

### Description
The `Store` class manages application state, allowing for namespaces and derived states.

### Methods
- **constructor(initialState)**: Initializes the store with a reactive state and optional initial state.
- **createNamespace(namespace, initialState)**: Creates a new namespace in the store.
- **subscribe(namespace, listener)**: Subscribes a listener to changes in a namespace.
- **derive(namespace, deriveFunction)**: Creates a derived state based on a namespace.
- **getDerived(namespace)**: Retrieves the derived state for a namespace.
- **setState(newValues)**: Sets new values for the state.
- **getState(namespace)**: Retrieves the state for a namespace.

---

## EventBus

### Description
The `EventBus` class is used for event-driven communication between components.

### Methods
- **constructor()**: Initializes the event bus with an empty listeners object.
- **on(event, listener)**: Subscribes a listener to a specific event.
- **emit(event, ...args)**: Emits an event, calling all subscribed listeners.
- **off(event, listener)**: Unsubscribes a listener from an event.
- **clear(event)**: Clears all listeners for a specific event.

---

## Error

### Description
The `Error` class provides static methods for logging warnings and errors.

### Methods
- **logWarning(warning)**: Logs a warning message with a timestamp.
- **logError(error)**: Logs an error message with a timestamp.
- **handler(error)**: A centralized error handler that logs errors.

---

## Component Management

### Description
The `defineComponent` function creates custom HTML elements with lifecycle methods and state management.

### Parameters
- **name**: The name of the custom element.
- **template**: The HTML template for the component.
- **connectedCallback**: A callback executed when the component is connected to the DOM.
- **props**: Initial properties for the component.
- **methods**: Methods available in the component instance.

---

## Selector

### Description
The `Selector` class provides methods for DOM manipulation and querying.

### Methods
- **constructor(selector, option)**: Initializes a selector with the specified selector string.
- **_getElements(selector, option)**: Retrieves elements matching the selector.
- **removeAllChildren()**: Removes all child elements from the selected elements.
- **css(styles)**: Applies CSS styles to the selected elements.
- **html(content)**: Sets the inner HTML of the selected elements.
- **text(content)**: Sets the inner text of the selected elements.
- **attributes(action, key, value)**: Gets or sets attributes for the selected elements.
- **removeChild(childElements)**: Removes specified child elements from the selected elements.
- **value(action, val)**: Gets or sets the value of input elements.
- **children()**: Retrieves child elements of the selected elements.
- **index()**: Gets the index of the selected elements among their siblings.
- **map(callback)**: Maps over selected elements and applies a callback.
- **parent()**: Retrieves parent elements of the selected elements.
- **classList(action, classes)**: Adds or removes classes from the selected elements.
- **reset()**: Resets the selector to its original state.
- **appendChild(childElement)**: Appends child elements to the selected elements.
- **on(event, callback)**: Adds event listeners to the selected elements.
- **_getAllElements()**: Retrieves all elements from the document body.
- **redraw()**: Redraws the selected elements in the DOM.

---

## VNode

### Description
The `VNode` class represents a virtual DOM node.

### Properties
- **tag**: The tag name of the virtual node.
- **props**: The properties of the virtual node.
- **children**: The children of the virtual node.
- **key**: A unique key for the virtual node.
- **el**: The actual DOM element associated with the virtual node.

---

## Utilities

### throttle(func, limit)
Throttles a function to ensure it runs at most once within the specified limit.

### debounce(func, wait)
Debounces a function to ensure it only runs after the specified wait time has elapsed.

---

## Platform Detection

### Description
Detects the platform on which the application is running.

### Methods
- **getPlatform()**: Returns the platform name.
- **isWindows()**: Checks if the platform is Windows.
- **isMac()**: Checks if the platform is macOS.
- **isLinux()**: Checks if the platform is Linux.
- **isAndroid()**: Checks if the platform is Android.
- **isIpad()**: Checks if the platform is iPad.
- **isIphone()**: Checks if the platform is iPhone.

---

## Global Methods

### selector(selector)
Creates a new `Selector` instance.

### store(state)
Creates a new `Store` instance.

### eventHandler(handler)
Creates a new `EventHandler` instance.

### reactive(reactive)
Creates a new `Reactive` instance.

### compManager(compManager)
Creates a new `ComponentManager` instance.

### lazyLoad(componentPath)
Dynamically imports and appends a component to the application.

---

This documentation serves as a reference for developers using MokshaJS. For further questions or contributions, please refer to the project's GitHub repository.
