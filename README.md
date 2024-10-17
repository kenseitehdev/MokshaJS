# MokshaJS

MokshaJS is a lightweight JavaScript library designed to build reactive, component-based user interfaces. It combines state management, event handling, component lifecycle management, and DOM rendering to create dynamic, scalable web applications. It also includes built-in utilities for event throttling, debouncing, and virtual DOM manipulation.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Core Components](#core-components)
  - [Utilities](#utilities)
- [Examples](#examples)
- [License](#license)

## Features

- **Reactive State Management:** Track changes in your application's state and automatically update the DOM when data changes.
- **Component Lifecycle:** Define, mount, and unmount custom components with full control over their lifecycle.
- **Event Bus:** Manage global events and decouple components through an event bus system.
- **Batch Updates:** Efficiently batch DOM updates using requestAnimationFrame to prevent unnecessary reflows.
- **Throttling and Debouncing:** Built-in utility functions for throttling and debouncing events.
- **Virtual DOM:** Use a virtual DOM diffing algorithm to optimize DOM updates.
- **Lazy Loading:** Dynamically load components as needed for better performance.

## Installation

You can install MokshaJS by including the script in your HTML file or by importing it into your project:

```html
<script type="module" src="path/to/moksha.js"></script>
```

Or, if using a bundler like Webpack or Rollup:

```js
import { $ } from './moksha.js';
```

## Usage

### Basic Example

Below is a basic example of using MokshaJS to create a reactive component:

```javascript
import { $, defineComponent, store } from './moksha.js';

const globalStore = store({
    count: 0
});

defineComponent({
    name: 'counter-component',
    template: `
        <div>
            <h1>Count: {{ count }}</h1>
            <button id="increment">Increment</button>
        </div>
    `,
    connectedCallback() {
        const button = this.querySelector('#increment');
        button.addEventListener('click', () => {
            globalStore.setState({ count: globalStore.getState('count') + 1 });
        });
    },
    props: { count: 0 }
});

$.init('#app', () => {
    const counterElement = document.createElement('counter-component');
    document.querySelector('#app').appendChild(counterElement);
});
```

### API Reference

#### Core Components

##### `Batch`
A class that batches update functions and ensures that they run efficiently using `requestAnimationFrame`.

```javascript
class Batch {
    add(updateFunction) { ... }
    scheduleFlush() { ... }
    flush() { ... }
}
```

##### `Reactive`
Manages reactive state. Notifies subscribers when the state changes.

```javascript
class Reactive {
    createReactiveState(initialState) { ... }
    subscribe(callback) { ... }
    notify() { ... }
}
```

##### `Store`
Manages the application's state with namespaces. Supports subscription and state derivation.

```javascript
class Store {
    createNamespace(namespace, initialState) { ... }
    subscribe(namespace, listener) { ... }
    derive(namespace, deriveFunction) { ... }
    getState(namespace) { ... }
    setState(newValues) { ... }
}
```

##### `EventBus`
A global event bus that allows decoupled components to communicate with each other.

```javascript
class EventBus {
    on(event, listener) { ... }
    emit(event, ...args) { ... }
    off(event, listener) { ... }
}
```

##### `defineComponent`
Creates a custom web component and manages its lifecycle and rendering.

```javascript
function defineComponent({ name, template, connectedCallback, props = {} }) { ... }
```

#### Utilities

##### `throttle`
Limits the execution of a function to once in a specified time period.

```javascript
function throttle(func, limit) { ... }
```

##### `debounce`
Delays the execution of a function until after a specified delay.

```javascript
function debounce(func, wait) { ... }
```

##### `lazyLoad`
Dynamically loads a component from a given path.

```javascript
async function lazyLoad(componentPath) { ... }
```

##### `Selector`
Utility for selecting and manipulating DOM elements.

```javascript
class Selector {
    css(styles) { ... }
    text(content) { ... }
    on(event, callback) { ... }
}
```

## Examples

### Creating a Reactive Counter

```javascript
import { $, defineComponent, store } from './moksha.js';

const globalStore = store({
    count: 0
});

defineComponent({
    name: 'counter-component',
    template: `
        <div>
            <h1>Count: {{ count }}</h1>
            <button id="increment">Increment</button>
        </div>
    `,
    connectedCallback() {
        const button = this.querySelector('#increment');
        button.addEventListener('click', () => {
            globalStore.setState({ count: globalStore.getState('count') + 1 });
        });
    },
    props: { count: 0 }
});

$.init('#app', () => {
    const counterElement = document.createElement('counter-component');
    document.querySelector('#app').appendChild(counterElement);
});
```

## License

MokshaJS is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT).
