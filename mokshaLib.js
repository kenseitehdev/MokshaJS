let $components = [];
let $vDOM = null,
$globalState = {};
class Batch {
    constructor() {
        this.queue = new Set();
        this.isFlushing = false;
        this.flushTimeout = null;
        this.flushDelay = 5;
    }
    add(e) {
        this.queue.add(e);
        this.scheduleFlush();
    }
    scheduleFlush() {
        if (!this.isFlushing) {
            if (this.flushTimeout) clearTimeout(this.flushTimeout);
            this.flushTimeout = setTimeout(() => this.flush(), this.flushDelay);
        }
    }
    flush() {
        if (this.queue.size !== 0) {
            this.isFlushing = true;
            requestAnimationFrame(() => {
                const tasks = Array.from(this.queue);
                this.queue.clear();
                tasks.forEach(task => {
                    try { task();} catch (error) { console.error("Error executing update function:", error);}
                });
                this.isFlushing = false;
                this.flushTimeout = null;
            });
        }
    }
}
class Reactive {
  constructor() {
this.state = {};
    this.subscribers = new Map();
    this.isBatching = false;
    this.updateQueue = [];
    this._proxyCache = new WeakMap();
    this.state = this.createProxy(this.state);
  }
  startBatch() {
    this.isBatching = true;
    this.updateQueue = [];
  }
  endBatch() {
    this.isBatching = false;
    this.flushUpdates();
  }
  queueUpdate(callback) {
    if (this.isBatching) {
      this.updateQueue.push(callback);} else {callback();}
  }
flushUpdates() {
  const updates = [...this.updateQueue];
  this.updateQueue = [];
  updates.forEach(callback => {this.queueUpdate(callback);});
  if (!this.isBatching) {this.flushUpdates();}
}
  createProxy(obj = {}) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (obj.__isProxy) return obj;
    if (this._proxyCache.has(obj)) return this._proxyCache.get(obj);
    const self = this;
    const proxy = new Proxy(obj, {
      get: (target, prop) => {
        if (prop === '__isProxy') return true;
        const value = target[prop];
        if (typeof value === 'object' && value !== null) {
          return self.createProxy(value);
        }
        return value;
      },
      set: (target, prop, value) => {
        const oldValue = target[prop];
        if (typeof value === 'object' && value !== null && !value.__isProxy) {
          value = self.createProxy(value);
        }
        if (oldValue !== value) {
          target[prop] = value;
          self.queueUpdate(() => self.notifySubscribers(prop, value));
        }
        return true;
      }
    });
    this._proxyCache.set(obj, proxy);
    return proxy;
  }
  subscribe(prop, callback) {
    if (!this.subscribers.has(prop)) {this.subscribers.set(prop, new Set());}
    this.subscribers.get(prop).add(callback);
    return () => {
      const callbacks = this.subscribers.get(prop);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) { this.subscribers.delete(prop);}
      }
    };
  }
  notifySubscribers(prop, value) {
    const subs = this.subscribers.get(prop);
    if (subs) {subs.forEach(callback => callback(value));}
  }
  serializeState() {
    const cleanState = JSON.parse(JSON.stringify(this.state));
    return JSON.stringify(cleanState);
  }
  hydrateState(serializedState) {
    const parsedState = JSON.parse(serializedState);
    this.state = this.createProxy(parsedState);
    Object.keys(this.state).forEach(key => {this.notifySubscribers(key, this.state[key]);});
  }
}
class Context {
  constructor() { this.contextMap = new Map(); }
  setContext(key, value) {  this.contextMap.set(key, value); }
  getContext(key) {  return this.contextMap.get(key); }
  removeContext(key) { this.contextMap.delete(key); }
  clearContext() {  this.contextMap.clear(); }
  hasContext(key) {  return this.contextMap.has(key); }
  getScopedContext(namespace) { return Array.from(this.contextMap.entries()).filter(([key, value]) => key.startsWith(`${namespace}.`)); }
}
class Store {
  constructor(globalState = {}, options = {}) {
    const initialState = this._loadState() || {};
    this.reactiveState = new Reactive();
    this.reactiveState.state = this._deepMerge(initialState, globalState);
    this.listeners = {};
    this.batch = new Batch();
    this.context = new Context();
    this.derivedState = {};
    this.options = { debounceTime: 50, ...options }; 
    this._debouncedNotify = this._debounce(this._notifyListeners.bind(this), this.options.debounceTime);
  }
_deepMerge(target, source) {
  if (typeof target !== 'object' || typeof source !== 'object') return source;
  for (let key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && target[key]) {
        target[key] = this._deepMerge(target[key], source[key]);
      } else {target[key] = source[key];}
    }
  }
  return target;
}
  _debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  _validateNamespace(namespace) {
    if (!/^[a-zA-Z0-9_.]+$/.test(namespace)) {
      throw new Error(`Invalid namespace "${namespace}". Must only contain alphanumeric characters and periods.`);
    }
  }
  _getNamespaceParts(namespace) {return namespace.split(".");}
  createNamespace(namespace, state = {}, isRoot = false) {
    this._validateNamespace(namespace);
    const parts = this._getNamespaceParts(namespace);
    let currentState = this.reactiveState.state;
    parts.forEach((part, index) => {
      if (!currentState[part]) {currentState[part] = {};}
      currentState = currentState[part];
      if (index === parts.length - 1 && !isRoot) {
        currentState = { ...currentState, ...state };
        this.listeners[namespace] = this.listeners[namespace] || [];
        this._debouncedNotify(namespace);
      }
    });
  }
  subscribe(namespace, callback) {
    this._validateNamespace(namespace);
    if (!this.listeners[namespace]) {this.listeners[namespace] = [];}
    this.listeners[namespace].push(callback);
    return () => this.unsubscribe(namespace, callback);
  }
  unsubscribe(namespace, callback) {
    this._validateNamespace(namespace);
    if (this.listeners[namespace]) {
      this.listeners[namespace] = this.listeners[namespace].filter(cb => cb !== callback);
    }
  }
  setState(namespace, value) {
    this._validateNamespace(namespace);
    const parts = this._getNamespaceParts(namespace);
    let state = this.reactiveState.state;
    parts.slice(0, -1).forEach(part => {
      if (!state[part]) {state[part] = {};}
      state = state[part];
    });
    const prop = parts[parts.length - 1];
    if (state[prop] !== value) {
      state[prop] = value;
      this._debouncedNotify(namespace);
    }
  }
  getState(namespace) {
    this._validateNamespace(namespace);
    const parts = this._getNamespaceParts(namespace);
    let state = this.reactiveState.state;
    for (let part of parts) {
      if (!state[part]) {return undefined; }
      state = state[part];
    }
    return state;
  }
  _notifyListeners(namespace) {
    const listeners = this.listeners[namespace];
    if (listeners) {
      this.batch.add(() => listeners.forEach(callback => callback(this.getState(namespace))));
    }
  }
  $saveState() {
    try {
      localStorage.setItem("storeState", JSON.stringify(this.reactiveState.state));
    } catch (error) {console.error("Failed to save state:", error);}
  }
  _loadState() {
    try {
      const state = localStorage.getItem("storeState");
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  }
  clearState() {
    this.reactiveState.state = {};
    this.listeners = {};
    localStorage.removeItem("storeState");
  }
migrateState(migrations, versionKey = "__version") {
  const state = this.reactiveState.state;
  const currentVersion = state[versionKey] || 0;
  Object.entries(migrations).forEach(([version, migrate]) => {
    if (currentVersion < version) {
      migrate(state);
      state[versionKey] = version;
    }
  });
  this.$saveState();
}};
class Selector {
    constructor(e, t = "") {
        this.selector = e;
        this.unmountedComponents = [];
        this.customFilters = []; 
        this.elements = this._getElements(e, t);
        this.normalizeElements();
    }
    normalizeElements() {
        if (!Array.isArray(this.elements)) { this.elements = this.elements ? [this.elements] : [];}
    }
    _getElements(e, t) {
        let s = e.split(",").map(e => e.trim()).flatMap(e => {
            let t;
            const s = e.match(/(.+)(:first|:last|:even|:odd|:nth-child\((\d+)\)|:nth-of-type\((\d+)\))$/);
            if (s) {
                const selector = s[1],
                      pseudo = s[2];
                t = this._getElementsBySelector(selector);
                t = this._applyPseudoClassFilter(t, pseudo);
            } else {t = this._getElementsBySelector(e);}
            return t.filter(Boolean);
        });
        return Array.isArray(s) ? s : s ? [s] : [];
    }
    _getElementsBySelector(e) {
        return e.startsWith("#")
            ? [document.getElementById(e.slice(1))]
            : e.startsWith(".")
            ? Array.from(document.getElementsByClassName(e.slice(1)))
            : Array.from(document.getElementsByTagName(e));
    }
    css(styles) {
        this.elements.forEach(e => { if (e) {  Object.assign(e.style, styles);}
        });
        return this;
    }
    html(content) {
        this.elements.forEach(e => { if (e) { e.innerHTML = content; }  });
        return this;
    }
    text(content) {
        this.elements.forEach(e => {  if (e) {  e.innerText = content; } });
        return this;
    }
    removeChild(childElements) {
        this.elements.forEach(e => {
            if (e) {
                if (Array.isArray(childElements)) {  childElements.forEach(child => e.contains(child) && e.removeChild(child));  } 
                else if (childElements instanceof Node) {  e.contains(childElements) && e.removeChild(childElements); } 
                else { console.error("Invalid child element"); }
            }
        });
        return this;
    }
    children() { this.elements = this.elements.flatMap(e => Array.from(e.children));  return this; }
    map(callback) {   return this.elements.map((e, index) => callback(e, index));  }
    classList(action, classNames) {
        this.elements.forEach(e => {
            if (e) {classNames.split(" ").forEach(className => {   e.classList[action](className); });
            }
        });
        return this;
    }
    appendChild(childElements) {
        this.elements.forEach(e => {
            if (e) {
                if (Array.isArray(childElements)) { childElements.forEach(child => e.appendChild(child));
                } else if (childElements instanceof Node) { e.appendChild(childElements);
                } else { console.error("Invalid child element"); }
            }
        });
        return this;
    }
    removeAllChildren() {
        this.elements.forEach(e => { if (e) {   while (e.firstChild) {    e.removeChild(e.firstChild);}  }
        });
        return this;
    }
    on(event, selectorOrHandler, handler) {
        if (typeof selectorOrHandler === "string") {
            const selector = selectorOrHandler;
            this.elements.forEach(e => {
                if (e) {
                    e.addEventListener(event, (e) => {if (e.target.matches(selector)) { handler(e); }  });
                }
            });
        } else if (typeof selectorOrHandler === "function") {
            const handlerFn = selectorOrHandler;
            this.elements.forEach(e => {  if (e) {  e.addEventListener(event, handlerFn); } });
        }
        return this;
    }
    off(event, handler) {
        this.elements.forEach(e => { if (e) {  e.removeEventListener(event, handler);} });
        return this;
    }
}
class EventBus {
    constructor() {   this.listeners = {}  }
    on(e, t) {  this.listeners[e] || (this.listeners[e] = []), this.listeners[e].push(t)  }
    emit(e, ...t) {   this.listeners[e] && this.listeners[e].forEach((e => e(...t)))  }
    off(e, t) {   this.listeners[e] && (this.listeners[e] = this.listeners[e].filter((e => e !== t))) }
    clear(e) {  this.listeners[e] && delete this.listeners[e]  }
}
class VNode { constructor(e, t = {}, s = [], r = null) {  this.tag = e, this.props = t, this.children = s, this.key = r, this.el = null }}
class Error {
  static extractLocation() {
    try {
      const stack = new Error().stack;
      const stackLines = stack.split("\n");
      const callerLine = stackLines[3] || stackLines[2];
      const match = callerLine.match(/at (.*?)(?: \((.*):(\d+):(\d+)\)| (\S+):(\d+):(\d+))/);
      if (!match) return { file: 'unknown', line: 'unknown', column: 'unknown' };
      const file = match[2] || match[5] || 'unknown';
      const line = match[3] || match[6] || 'unknown';
      const column = match[4] || match[7] || 'unknown';
      return { file, line, column };
    } catch (error) {
      return { file: 'unknown', line: 'unknown', column: 'unknown' };
    }
  }
  static sanitizeContext(context) {
    try {
      return JSON.stringify(context, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (context.visited) {return;}
          context.visited = true;
        }
        return value;
      });
    } catch (e) {return "[Context Serialization Error]";}
  }
  static log(type, message, context = {}) {
    try {
      const { file, line, column } = this.extractLocation();
      const timestamp = new Date().toISOString();
      let logMessage = `[${timestamp}] ${type}: ${message} at ${file}:${line}:${column}`;
      if (context.componentName) {
        logMessage = `[Component: ${context.componentName}] ${logMessage}`;
      }
      if (context.additionalInfo) {
        const safeInfo = typeof context.additionalInfo === 'object' 
          ? this.sanitizeContext(context.additionalInfo)
          : String(context.additionalInfo);
        logMessage += ` | Additional Info: ${safeInfo}`;
      }
      if (process.env.NODE_ENV !== 'production') {
        if (!window._errorLogs) window._errorLogs = [];
        window._errorLogs.push({
          type,
          message,
          location: { file, line, column },
          timestamp,
          context
        });
      }
      console[type.toLowerCase() === 'error' ? 'error' : 'warn'](logMessage);
      if (type.toLowerCase() === 'error' && process.env.NODE_ENV === 'production' && window.errorReporter) {
        window.errorReporter.captureError(message, {
          location: { file, line, column },
          context
        });
      }
    } catch (logError) {console.error("ErrorLogger failed to log an error:", logError);}
  }
  static logWarning(message, context = {}) {this.log('Warning', message, context);}
  static logError(message, context = {}) {this.log('Error', message, context);}
  static logComponentError(componentName, message, context = {}) {
    context.componentName = componentName;
    this.log('Error', message, context);
  }
  static boundary(tryFn, catchFn, componentName = '') {
    try {
      return tryFn();
    } catch (error) {
      const context = componentName ? { componentName } : {};
      this.logError(error.message, { ...context, stack: error.stack });
      if (typeof catchFn === 'function') {return catchFn(error);}
    }
  }
  static async boundaryAsync(tryFn, catchFn, componentName = '') {
    try {
      return await tryFn();
    } catch (error) {
      const context = componentName ? { componentName } : {};
      this.logError(error.message, { ...context, stack: error.stack });
      if (typeof catchFn === 'function') {return catchFn(error);}
    }
  }
  static rateLimitLogs(limit = 10, interval = 60000) {
    let logCount = 0;
    let start = Date.now();
    return (logFn) => {
      if (Date.now() - start > interval) {
        logCount = 0;
        start = Date.now();
      }
      if (logCount < limit) {
        logFn();
        logCount++;
      } else {
        console.warn("Rate limit exceeded for logs.");
      }
    };
  }
}
async function lazyLoad(e) {
    const t = document.createElement("div");
    t.className = "loader", appElement.appendChild(t);
    try {
        const t = "./components/${e}.js";
        if (!componentMap[t]) throw new Error(`Component ${e} not found.`);
        {
            const e = (await componentMap[t]()).default;
            appElement.appendChild(e())
        }
    } catch (e) { console.error("Error loading component:", e)} 
    finally {t.remove()}
}
function $defineComponent({
    name,
    template,
    styles = "",
    onMount,
    onUpdate,
    onDestroy,
    onRender,
    onError,
    props = {},
    methods = {}
}) {
    if (!name) throw new Error("Component must have a 'name' property.");
    if (!template || typeof template !== "string") throw new Error("Component must have a 'template' property defined as a string.");
    class Component extends HTMLElement {
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
            this.onMount = onMount;
            this.onDestroy = onDestroy;
            this.onUpdate = onUpdate;
            this.onRender = onRender;
            this.onError = onError;
            for (const method in methods) {this[method] = methods[method].bind(this);}
            this.state = { updated: false };
            this.lifecycle = {
                created: false,
                mounted: false,
                updated: false,
                destroyed: false
            };
            this.uniqueClass = `scoped-${Math.random().toString(36).substr(2, 9)}`;
            if (!this.handleClick) {this.handleClick = (event) => {};}
        }
        connectedCallback() {
            this.dispatchEvent(new CustomEvent("mount", { detail: this }));
            this.lifecycle.created = true;
            this.applyScopedStyles();
            this.render();
            this.safeInvoke(this.onMount);
            this.addEventListener("click", this.handleClick);
            this.lifecycle.mounted = true;
        }
        disconnectedCallback() {
            this.lifecycle.mounted=false;
            this.lifecycle.updated=true;
            this.lifecycle.destroyed=true;
            this.safeInvoke(this.onDestroy);
            this.removeEventListener("click", this.handleClick);
            if (this.unsubscribe) this.unsubscribe();
            if (this.intervalId) clearInterval(this.intervalId);
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.cleanupScopedStyles();
        }
        registerHook(hookName, value) {
            if (this.lifecycle.hasOwnProperty(hookName)) {
                this.lifecycle[hookName] = value;
            } else {
                console.warn(`Hook ${hookName} is not defined.`);}
        }
        applyScopedStyles() {
            if (styles) {
                const styleElement = document.createElement("style");
                const scopedStyles = styles.replace(/\.([\w-]+)/g, `.${this.uniqueClass} .$1`);
                styleElement.textContent = scopedStyles;
                this.styleElement = styleElement;
                if (!document.head.contains(styleElement)) {
                    document.head.appendChild(styleElement);
                }
                this.classList.add(this.uniqueClass);
            }
        }
        cleanupScopedStyles() {
            if (this.styleElement && document.head.contains(this.styleElement)) {
                document.head.removeChild(this.styleElement);
            }
            this.classList.remove(this.uniqueClass);
        }
        shouldRender(newProps) {
            if (!this.props) return true;
            for (const key in newProps) {
                if (this.props[key] !== newProps[key]) {
                    return true;
                }
            }
            for (const key in this.props) {
                if (!(key in newProps)) {return true;}
            }
            return false;
        }
        update(newProps) {
            if (this.shouldRender(newProps)) {
                this.safeInvoke(this.onUpdate);
                this.props = { ...newProps };
                this.render();
                this.lifecycle.updated = true;
            }
        }
        destroy() {
            this.remove();
            this.lifecycle.destroyed = true;
            this.safeInvoke(this.onDestroy);
        }
        static get observedAttributes() {
            return Object.keys(props);
        }
        attributeChangedCallback(attrName, oldValue, newValue) {
            if (oldValue !== newValue) {
                this.props[attrName] = newValue;
                this.update(this.props);
            }
        }
        render() {
            $components.push({ id: $components.length, component: this });
            const content = this.template.content.cloneNode(true);
            this.replacePlaceholdersInContent(content);
            this.innerHTML = "";
            this.appendChild(content);
            this.safeInvoke(this.onRender);
        }
        replacePlaceholdersInContent(content) {
            const textWalker = document.createTreeWalker(
                content,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            let textNode;
            while ((textNode = textWalker.nextNode())) {
                const text = textNode.nodeValue;
                textNode.nodeValue = text.replace(/{{\s*(\w+)\s*}}/g, (match, propName) => {
                    return this.props[propName] !== undefined ? this.props[propName] : "";
                });
            }
            content.querySelectorAll("*").forEach(element => {
                Array.from(element.attributes).forEach(attr => {
                    attr.value = attr.value.replace(/{{\s*(\w+)\s*}}/g, (match, propName) => {
                        return this.props[propName] !== undefined ? this.props[propName] : "";
                    });
                });
                if (element.innerHTML.includes("{{")) {
                    element.innerHTML = element.innerHTML.replace(/{{\s*(\w+)\s*}}/g, (match, propName) => {
                        return this.props[propName] !== undefined ? this.props[propName] : "";
                    });
                }
            });
        }
        safeInvoke(callback) {
            if (typeof callback === "function") {
                try {callback.call(this);
                } catch (error) {this.handleError(error);}
            }
        }
        handleError(error) {
            if (this.onError) {this.onError.call(this, error);} 
            else {console.error(`Error in component ${name}:`, error);}
        }
    }
    if (!customElements.get(name)) {customElements.define(name, Component);}
    return (propsData = {}, options = {}) => {
        const comp = document.createElement(name);
        $components.push(comp);
        Object.entries(propsData).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                comp.setAttribute(key, value.toString());
            } else {
                comp[key] = value;
            }
        });
        return comp;
    };
}
function throttle(e, t) {
    let s, r;
    return function(...n) {
        const i = this;
        r ? (clearTimeout(s), s = setTimeout((function() {
            Date.now() - r >= t && (e.apply(i, n), r = Date.now())
        }), t - (Date.now() - r))) : (e.apply(i, n), r = Date.now())
    }
}
function debounce(e, t) {
    let s;
    return function(...r) { const n = this; clearTimeout(s), s = setTimeout((() => e.apply(n, r)), t)}
}
function propsChanged(e, t) {
    const s = Object.keys(e),
        r = Object.keys(t);
    if (s.length !== r.length) return true;
    for (const key of s) {
        if (typeof e[key] === 'object' && typeof t[key] === 'object') {
            if (propsChanged(e[key], t[key])) return true;
        } else if (e[key] !== t[key]) {
            return true;
        }
    }
    return false;
}
function diff(oldVDOM, newVDOM) {
    if (!oldVDOM) {
        return { type: 'CREATE', newNode: newVDOM };
    }
    if (!newVDOM) {
        return { type: 'REMOVE', oldNode: oldVDOM };
    }
    if (typeof oldVDOM !== typeof newVDOM || oldVDOM.tagName !== newVDOM.tagName) {
        return { type: 'REPLACE', oldNode: oldVDOM, newNode: newVDOM };
    }
    if (typeof oldVDOM === 'string' || typeof oldVDOM === 'number') {
        if (oldVDOM !== newVDOM) {
            return { type: 'TEXT', oldNode: oldVDOM, newNode: newVDOM };
        }
        return null;
    }
    const oldProps = oldVDOM.props || {};
    const newProps = newVDOM.props || {};
    const propPatches = diffProps(oldProps, newProps);
    const oldChildren = oldVDOM.children || [];
    const newChildren = newVDOM.children || [];
    const childPatches = diffChildren(oldChildren, newChildren);
    if (propPatches.length === 0 && childPatches.length === 0) {
        return null;
    }
    return { type: 'UPDATE', propPatches, childPatches, oldNode: oldVDOM, newNode: newVDOM };
}
function diffProps(oldProps, newProps) {
    const patches = [];
    Object.keys(oldProps).forEach(prop => {
        if (!(prop in newProps)) {
            patches.push({ prop, value: null });
        }
    });
    Object.keys(newProps).forEach(prop => {
        if (oldProps[prop] !== newProps[prop]) {
            patches.push({ prop, value: newProps[prop] });
        }
    });
    return patches;
}
function diffChildren(oldChildren, newChildren) {
    const patches = [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < maxLen; i++) {
        patches.push(diff(oldChildren[i], newChildren[i]));
    }
    return patches.filter(patch => patch !== null);
}
function patchChildren(parent, oldChildren, newChildren) {
    const keyedElements = new Map();
    newChildren.forEach((newChild) => {
        if (newChild.key) {
            keyedElements.set(newChild.key, newChild);
        }
    });
    oldChildren.forEach((oldChild) => {
        const key = oldChild.key;
        if (key && !keyedElements.has(key)) {
            parent.removeChild(oldChild.el);
        }
    });
    newChildren.forEach((newChild) => {
        const key = newChild.key;
        if (key && keyedElements.has(key)) {
            const oldChild = keyedElements.get(key);
            if (diff(oldChild, newChild)) {
                const renderedNode = renderNode(newChild);
                parent.replaceChild(renderedNode, oldChild.el);
                keyedElements.delete(key);
            }
        } else {
            const renderedNode = renderNode(newChild);
            parent.appendChild(renderedNode);
        }
    });
    keyedElements.forEach((remainingChild) => {
        parent.removeChild(remainingChild.el);
    });
}
function $init(e, t) {
    window.addEventListener("load", (() => {
        const s = $selector(e);
        $attempt((() => {
            s.innerHTML = "", $vDOM = new VNode("div", {id: "app"
            }), $render(s), t()
        }), (() => Error.logError(`Mount element ${e} not found.`)))
    }))
}
function $render(e) {e.innerHTML = "", renderNode($vDOM, e)}
function renderNode(e, t) {
    const s = document.createElement(e.tag);
    Object.entries(e.props).forEach((([e, t]) => {
        s[e] = t})), 
        e.children.forEach((e => {
        const t = "string" == typeof e ? document.createTextNode(e) : renderNode(e, s);
        s.appendChild(t)})), t.appendChild(s)
}
function updateVNode(e) {
    const t = vDOM.el.parentNode;
    $attempt((() => {diff(vDOM, e) || $patchChildren(t, vDOM.children, e.children)}), 
        (() => {Error.logError("Failed to update VNode: Parent element not found or other error occurred.")})), $vDOM = e
}
function registerComponent(e, t) { $components.add(t)}
function updateGlobalState(e) {
    globalState = {
        ...globalState,
        ...e
    }, updateComponents()
}
async function $attempt(e, {
    errorMessage: t = "An error occurred",
    warningMessage: s = "A warning occurred"
} = {}) {
    try {await e()} catch (e) {e instanceof WarningError ? console.warn(s, e) : console.error(t, e)}
}
class WarningError extends Error {}
function updateComponents() { components.forEach((e => {e.updateCallback && e.updateCallback(globalState)}))}
const $selector = e => new Selector(e),
    $store = e => new Store(e),
    $reactive = e => new Reactive(),
    $context = e => new Context(e),
    $error = e => new Error(e);
export {
    $selector,
    $store,
    $context,
    $reactive,
    $defineComponent,
    $error,
    $components,
    $vDOM,
    $init,
    $render,
    $attempt
};
