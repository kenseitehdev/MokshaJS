let $components =[];
class Batch {
    constructor() {
        this.queue = new Set(); 
        this.isFlushing = false;
        this.flushTimeout = null; 
    }
    add(updateFunction) {
        this.queue.add(updateFunction); 
        this.scheduleFlush(); 
    }
    scheduleFlush() {
        if (this.isFlushing) return; 
        if (this.flushTimeout) { clearTimeout(this.flushTimeout); }
        this.flushTimeout = setTimeout(() => this.flush(), 0); 
    }
    flush() {
        if (this.queue.size === 0) return; 
        this.isFlushing = true;
        requestAnimationFrame(() => {
            this.queue.forEach(updateFunction => updateFunction());
            this.queue.clear(); 
            this.isFlushing = false;
        });
    }
}
class Reactive {
constructor(obj) {
        return new Proxy(obj, {
            set: (target, property, value) => {
                target[property] = value;
                this.notify(); 
                return true;
            },
            get: (target, property) => {return target[property];}
        });
    }
    subscribe(callback) {this.subscribers.add(callback);}
    unsubscribe(callback) {this.subscribers.delete(callback);}
    notify() {this.subscribers.forEach(callback => callback());}
    createReactiveState(initialState) {
        const handler = {
            set(target, property, value) {
                target[property] = value; 
                this.notify(); 
                return true; 
            },
            get(target, property) {return target[property]; }
        };
        const state = new Proxy(initialState, handler); 
        return state; 
    }
}
class Store {
    constructor(initialState = {}) {
        this.reactiveState = new Reactive(this._loadState() || initialState);
        this.listeners = {};
        this.batch = new Batch();
        this.derivedState = {}; 
    }
    createNamespace(namespace, initialState) {
        if (!this.reactiveState.state[namespace]) {
            this.reactiveState.state[namespace] = initialState;
            this.listeners[namespace] = [];
            this.reactiveState.notify(); 
        } else {Error.logWarning(`Namespace ${namespace} already exists.`);}
    }
    $subscribe(namespace, listener) {
        if (!this.listeners[namespace]) { throw new Error(`Namespace ${namespace} not found.`);}
        this.listeners[namespace].push(listener);
        return () => {this.listeners[namespace] = this.listeners[namespace].filter(l => l !== listener);};
    }
    derive(namespace, deriveFunction) {
        if (!this.reactiveState.state[namespace]) {throw new Error(`Namespace ${namespace} not found.`);}
        this.derivedState[namespace] = deriveFunction(this.reactiveState.state[namespace]);
        this.subscribe(namespace, () => {this.derivedState[namespace] = deriveFunction(this.reactiveState.state[namespace]);});
    }
    getDerived(namespace) {return this.derivedState[namespace];}
$setState(namespace, newState) {
        const keys = namespace.split('.');
        let current = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {current[key] = {};}
            current = current[key];
        }
        const lastKey = keys[keys.length - 1];
        current[lastKey] = newState;
        this.state.notify();
    }
    $getState(namespace) {return this.reactiveState.state[namespace];}
    _notifyListeners(namespace) {
        const namespaceListeners = this.listeners[namespace];
        if (namespaceListeners) {this.batch.add(() => {namespaceListeners.forEach(listener => listener(this.reactiveState.state[namespace]));});}
    }
    _isEqual(prevState, newState) { return JSON.stringify(prevState) === JSON.stringify(newState);}
    _saveState() {localStorage.setItem('storeState', JSON.stringify(this.reactiveState.state));}
    _loadState() {
        const savedState = localStorage.getItem('storeState');
        return savedState ? JSON.parse(savedState) : null;
    }
}
class EventBus {
    constructor() {this.listeners = {};}
    on(event, listener) {
        if (!this.listeners[event]) { this.listeners[event] = []; }
        this.listeners[event].push(listener);
    }
    emit(event, ...args) { if (this.listeners[event]) { this.listeners[event].forEach(listener => listener(...args)); } }
    off(event, listener) {if (this.listeners[event]) { this.listeners[event] = this.listeners[event].filter(l => l !== listener); } }
    clear(event) {if (this.listeners[event]) { delete this.listeners[event]; }}
}
class $Error {
    static logWarning(warning) {console.warn(`[${new Date().toISOString()}] Warning:`, warning);}
    static logError(error) {console.error(`[${new Date().toISOString()}] Error:`, error);}
    static handler(error) {this.logError(error);}
}
function $defineComponent({ name, template, connectedCallback, props = {}, methods = {} }) {
    if (!name) {throw new Error("Component must have a 'name' property.");}
    if (!template || typeof template !== 'string') {throw new Error("Component must have a 'template' property defined as a string.");}
    class CustomElement extends HTMLElement {
        constructor(store, namespace, updateCallback) {
            super();
            this.props = { ...props };
            this.template = document.createElement("template");
            this.template.innerHTML = template;
            this.namespace = namespace;
            this.store = store;
            this.selector = this.querySelector;
            this.selectorAll = this.querySelectorAll;
            this.updateCallback = updateCallback;
            for (const methodName in methods) {this[methodName] = methods[methodName].bind(this); }
            this.state = { updated: false };
            this.lifecycle = {
                created: false,
                mounted: false,
                updated: false,
                destroyed: false,
            };
        }
        connectedCallback() {
            this.lifecycle.created = true;
            this.render();
            if (connectedCallback) { connectedCallback.call(this);}
            this.addEventListener('click', this.handleClick);
        }
        disconnectedCallback() {
            this.removeEventListener('click', this.handleClick); 
            if (this.unsubscribe) { this.unsubscribe(); }
            if (this.intervalId) { clearInterval(this.intervalId); }
            if (this.timeoutId) { clearTimeout(this.timeoutId); }
        }
        selector(selector) {
            if (this.selector) {return this.selector.querySelector(selector);}
            return document.querySelector(selector);
        }
        selectorAll(selector) {
            if (this.selector) {return Array.from(this.selector.querySelectorAll(selector));}
            return Array.from(document.querySelectorAll(selector));
        }
        shouldRender(newProps) { 
            for (const key in newProps) {
                if (this.props[key] !== newProps[key]) {return true;  }
            } 
            this.lifecycle.updated = false;
            return false; 
        }
        update(newProps) {
            if (this.shouldRender(newProps)) {
                this.props = newProps; 
                this.render(); 
                this.lifecycle.updated = true;
            }
        }
        destroy() {
            this.remove(); 
            this.lifecycle.destroyed = true;
            this.disconnectedCallback();
        }
        static get observedAttributes() {return Object.keys(props);}
        attributeChangedCallback(attr, oldValue, newValue) {
            if (oldValue !== newValue) {
                this.updated = false;
                this.props[attr] = newValue;
                this.update(this.props);
            }
        }
        render() {
            $components.push({ id: $components.length, component: this });
            const content = this.template.content.cloneNode(true);
            this.replacePlaceholdersInContent(content);
            this.innerHTML = "";
            this.appendChild(content);
            this.lifecycle.mounted = true;
        }
        replacePlaceholdersInContent(content) { 
            content.querySelectorAll("*").forEach(el => { 
                el.innerHTML = el.innerHTML.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
                    return this.getAttribute(p1) || this.props[p1] || "";
                });
            });
        }
    }
    if (!customElements.get(name)) {customElements.define(name, CustomElement); }
    return (props = {}, methods = {}) => {
        const el = document.createElement(name);
        Object.keys(props).forEach(key => el.setAttribute(key, props[key]));
        return el;
    };
}
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
class Selector {
    constructor(selector, option = "") {
        this.selector = selector;
        this.unmountedComponents = []; 
        this.elements = this._getElements(selector, option);
    }
    _getElements(selector, option) {
        let elements;
        if (selector.startsWith("#")) {elements = document.getElementById(selector.slice(1));} 
        else if (selector.startsWith(".")) { elements = Array.from(document.getElementsByClassName(selector.slice(1)));} 
        else {elements = Array.from(document.getElementsByTagName(selector));}
        if (!elements || (Array.isArray(elements) && elements.length === 0)) {
            elements = this.unmountedComponents.filter(comp => {
                if (selector.startsWith("#")) { return comp.id === selector.slice(1); } 
                else if (selector.startsWith(".")) { return comp.classList.contains(selector.slice(1));} 
                else {return comp.tagName.toLowerCase() === selector;}
            });
        }
        if (option === "all") {return Array.isArray(elements) ? elements : [elements]; }
        return Array.isArray(elements) ? elements[0] : elements;
    }
    removeAllChildren() {
    this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
    this.elements.forEach(el => {
        if (el) { while (el.firstChild) { el.removeChild(el.firstChild); } }
    });
    return this;
}
    css(styles) {
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) Object.assign(el.style, styles);
        });
        return this;
    }
     html(content) {this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
this.elements.forEach(el => {
            if (el) {el.innerHTML = content;}
        });
        return this;
    }
    text(content) {
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) el.innerText = content;
        });
        return this;
    }
    attributes(action, key, value) {
        if (action === "get") {return this.elements ? (Array.isArray(this.elements) ? this.elements[0]?.getAttribute(key) : this.elements.getAttribute(key)) : null;} 
        else if (action === "set") {
            this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
            this.elements.forEach(el => {
                if (el) el.setAttribute(key, value);
            });
        }
        return this;
    }
    removeChild(childElements) {
        const removeSingleChild = (el, child) => {
            if (el.contains(child)) { el.removeChild(child); }
        };
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) {
                if (Array.isArray(childElements)) { childElements.forEach(child => removeSingleChild(el, child));} 
                else if (childElements instanceof Node) { removeSingleChild(el, childElements);} 
                else {Error.logError("Invalid child element");}
            }
        });
        return this;
    }
    value(action, val) {
        if (action === "get") {return this.elements ? (Array.isArray(this.elements) ? this.elements[0]?.value : this.elements.value) : null;}
        if (action === "set") {
            this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
            this.elements.forEach(el => {
                if (el) el.value = val;
            });
        }
        return this;
    }
    children() {
        this.elements = Array.isArray(this.elements) ? this.elements.flatMap(el => Array.from(el.children)) : [this.elements];
        return this;
    }
    index() {
        return this.elements.map(el => {
            const parent = el.parentNode;
            return parent ? Array.from(parent.children).indexOf(el) : -1;
        });
    }
    map(callback) {return this.elements.map((el, index) => callback(el, index));}
    parent() {
        this.elements = Array.from(new Set(this.elements.map(el => el.parentNode).filter(Boolean)));
        return this;
    }
    classList(action, classes) {
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) { classes.split(" ").forEach(cls => { el.classList[action](cls); }); }
        });
        return this;
    }
    reset() {
        this.elements = this._getElements(this.selector, "");
        return this;
    }
    appendChild(childElement) {
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) {
                if (Array.isArray(childElement)) {childElement.forEach(child => el.appendChild(child));} 
                else if (childElement instanceof Node) {el.appendChild(childElement);} 
                else {Error.logError("Invalid child element"); }
            }
        });
        return this;
    }
    on(event, callback) {
        this.elements = Array.isArray(this.elements) ? this.elements : [this.elements];
        this.elements.forEach(el => {
            if (el) el.addEventListener(event, callback);
        });
        return this;
    }
    _getAllElements() {return Array.from(document.body.children);}
    redraw() {
        this._getAllElements().forEach(el => {
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
        });
    }
}
const lazyLoad = async (componentPath) => {
    try {
        const { default: MyComponent } = await import(componentPath);
        appElement.appendChild(new MyComponent());
    } catch (error) { Error.logError("Error loading component:", error);}
};
class VNode {
    constructor(tag, props = {}, children = [], key = null) {
        this.tag = tag;      
        this.props = props;  
        this.children = children; 
        this.key = key;      
        this.el = null;      
    }
}
function propsChanged(oldProps, newProps) {
    const oldKeys = Object.keys(oldProps);
    const newKeys = Object.keys(newProps);
    if (oldKeys.length !== newKeys.length) return true;
    for (const key of oldKeys) { if (oldProps[key] !== newProps[key]) return true; }
    return false;
}
function diff(oldVNode, newVNode) {
    if (!oldVNode && !newVNode) return;
    if (!oldVNode || !newVNode || oldVNode.tag !== newVNode.tag || oldVNode.key !== newVNode.key) { return newVNode; }
    if (propsChanged(oldVNode.props, newVNode.props)) { updateProps(oldVNode.el, oldVNode.props, newVNode.props); }
    const oldChildren = oldVNode.children || [];
    const newChildren = newVNode.children || [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);
    const patches = [];
    for (let i = 0; i < maxLength; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        const patch = diff(oldChild, newChild);
        if (patch) { patches.push(patch); }
    }
    return new $VNode(newVNode.tag, newVNode.props, patches);
}
function patchChildren(parentEl, oldChildren, newChildren) {
    const keyMap = new Map();
    oldChildren.forEach((child) => { if (child.key) { keyMap.set(child.key, child); } });
    newChildren.forEach((newChild) => {
        if (newChild.key && keyMap.has(newChild.key)) {
            const child = keyMap.get(newChild.key);
            const isSameNode = diff(child, newChild);
            if (!isSameNode) {
                const newEl = renderNode(newChild);
                parentEl.replaceChild(newEl, child.el);
            }
            keyMap.delete(newChild.key); 
        } else {
            const newEl = $renderNode(newChild);
            parentEl.appendChild(newEl); 
        }
    });
    keyMap.forEach((child) => { parentEl.removeChild(child.el); });
}
let $vDOM = null;
let $globalState = {};
function $init(mountSelector, callback) {
    window.addEventListener("load", () => {
        const mountPoint = document.querySelector(mountSelector);
        if (mountPoint) {
            mountPoint.innerHTML = "";
            $vDOM = new VNode("div", { id: "app" });
            $render(mountPoint);
            callback();
        } else {$logError(`Mount element "${mountSelector}" not found.`);}
    });
}
function $render(mountPoint) {
    mountPoint.innerHTML = "";
    renderNode($vDOM, mountPoint);
}
function renderNode(vnode, parent) {
    const el = document.createElement(vnode.tag);
    Object.entries(vnode.props).forEach(([key, value]) => {el[key] = value;});
    vnode.children.forEach(child => {
        const childNode = typeof child === "string" ? document.createTextNode(child) : renderNode(child, el);
        el.appendChild(childNode);
    });
    parent.appendChild(el);
}
function updateVNode(newVNode) {
    const parentEl = vDOM.el.parentNode;
    if (parentEl) {
        const isSame = diff(vDOM, newVNode);
        if (!isSame) {$patchChildren(parentEl, vDOM.children, newVNode.children);}
    }
    $vDOM = $newVNode;
}
function registerComponent(name, component) {$components.add(component);}
function updateGlobalState(newState) {
    globalState = { ...globalState, ...newState };
    updateComponents();
}
function updateComponents() {
    components.forEach(component => {if (component.updateCallback) {component.updateCallback(globalState);}});
}
const $selector = (selector) => new Selector(selector);
const $store = (state) => new Store(state);
const $reactive = (reactive) => new Reactive(reactive);
export { 
    $selector, 
    $store, 
    $reactive, 
    $defineComponent,
    $Error,
    $components,
    $vDOM,
    $init,
    $render,
};
