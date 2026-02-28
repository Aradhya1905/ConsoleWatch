/**
 * ConsoleWatch Client Snippet
 *
 * Copy-paste this into your app's entry point (index.js, App.js, etc.)
 * to start seeing logs in your VSCode ConsoleWatch panel.
 *
 * Features: Console logs, Network requests, State management (Redux/Zustand)
 *
 * This will only run in development mode.
 */
(function() {
  // Only run in development
  if (typeof __DEV__ !== 'undefined' ? !__DEV__ : process.env.NODE_ENV !== 'development') return;

  var url = 'ws://localhost:9090';
  var ws = null;
  var queue = [];
  var reconnects = 0;
  var sessionId = Date.now() + '-' + Math.random().toString(36).slice(2);

  function id() {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function safe(obj, depth) {
    depth = depth || 0;
    if (obj === null) return null;
    if (obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Error) return { name: obj.name, message: obj.message, stack: obj.stack };
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(function(v) { return safe(v, depth + 1); });
    var r = {};
    Object.keys(obj).forEach(function(k) {
      try { r[k] = safe(obj[k], depth + 1); } catch(e) { r[k] = '[Error]'; }
    });
    return r;
  }

  function send(msg) {
    var full = Object.assign({ id: id(), timestamp: Date.now(), meta: { sessionId: sessionId } }, msg);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(full));
    } else {
      queue.push(full);
      if (queue.length > 100) queue.shift();
    }
  }

  function connect() {
    try {
      ws = new WebSocket(url);
      ws.onopen = function() {
        reconnects = 0;
        send({ type: 'connection', payload: { status: 'connected' } });
        queue.forEach(function(m) { ws.send(JSON.stringify(m)); });
        queue = [];
      };
      ws.onclose = function() {
        ws = null;
        if (reconnects < 5) {
          reconnects++;
          setTimeout(connect, Math.min(1000 * reconnects, 5000));
        }
      };
      ws.onerror = function() { ws && ws.close(); };
    } catch(e) {}
  }

  // Patch console
  ['log', 'warn', 'error', 'info', 'debug'].forEach(function(m) {
    var orig = console[m];
    console[m] = function() {
      var args = Array.prototype.slice.call(arguments);
      send({ type: 'console', payload: { method: m, args: args.map(safe) } });
      orig.apply(console, args);
    };
  });

  // Get global object (works in browser, React Native, Node.js)
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global;

  // Patch fetch
  if (typeof fetch !== 'undefined') {
    var origFetch = fetch;
    g.fetch = function(input, init) {
      var reqUrl = typeof input === 'string' ? input : (input.url || input.href || String(input));
      var method = (init && init.method) || 'GET';
      var reqId = id();
      var start = performance.now();
      var reqHeaders = {};
      var reqBody = null;

      // Capture request headers
      if (init && init.headers) {
        var h = new Headers(init.headers);
        h.forEach(function(v, k) { reqHeaders[k] = k.toLowerCase() === 'authorization' ? '[REDACTED]' : v; });
      }
      // Capture request body
      if (init && init.body) {
        try { reqBody = typeof init.body === 'string' ? JSON.parse(init.body) : '[Binary/FormData]'; }
        catch(e) { reqBody = init.body; }
      }

      return origFetch.apply(this, arguments).then(function(res) {
        var clone = res.clone();
        var resHeaders = {};
        res.headers.forEach(function(v, k) { resHeaders[k] = v; });

        clone.text().then(function(text) {
          var body = null;
          try { body = text ? JSON.parse(text) : null; } catch(e) { body = text; }
          send({
            type: 'network',
            payload: {
              requestId: reqId, url: reqUrl, method: method,
              status: res.status, statusText: res.statusText,
              duration: Math.round(performance.now() - start),
              size: text.length,
              requestHeaders: reqHeaders, requestBody: safe(reqBody),
              responseHeaders: resHeaders, responseBody: safe(body)
            }
          });
        });
        return res;
      }).catch(function(err) {
        send({
          type: 'network',
          payload: {
            requestId: reqId, url: reqUrl, method: method,
            status: 0, statusText: 'Network Error',
            duration: Math.round(performance.now() - start),
            error: err.message,
            requestHeaders: reqHeaders, requestBody: safe(reqBody)
          }
        });
        throw err;
      });
    };
  }

  // Patch XMLHttpRequest
  if (typeof XMLHttpRequest !== 'undefined') {
    var XHR = XMLHttpRequest.prototype;
    var origOpen = XHR.open, origSend = XHR.send, origSetHeader = XHR.setRequestHeader;

    XHR.open = function(method, url) {
      this._cw = { method: method, url: String(url), headers: {}, requestId: id(), startTime: 0 };
      return origOpen.apply(this, arguments);
    };

    XHR.setRequestHeader = function(name, value) {
      if (this._cw) this._cw.headers[name] = name.toLowerCase() === 'authorization' ? '[REDACTED]' : value;
      return origSetHeader.apply(this, arguments);
    };

    XHR.send = function(body) {
      var self = this, meta = this._cw;
      if (meta) {
        meta.startTime = performance.now();
        if (body) {
          try { meta.body = typeof body === 'string' ? JSON.parse(body) : '[Binary/FormData]'; }
          catch(e) { meta.body = body; }
        }

        this.addEventListener('load', function() {
          var respBody = null;
          try { respBody = self.responseText ? JSON.parse(self.responseText) : null; }
          catch(e) { respBody = self.responseText; }

          var respHeaders = {};
          var headerStr = self.getAllResponseHeaders();
          if (headerStr) {
            headerStr.split('\r\n').forEach(function(line) {
              var parts = line.split(': ');
              if (parts.length === 2) respHeaders[parts[0]] = parts[1];
            });
          }

          send({
            type: 'network',
            payload: {
              requestId: meta.requestId, url: meta.url, method: meta.method,
              status: self.status, statusText: self.statusText,
              duration: Math.round(performance.now() - meta.startTime),
              size: (self.responseText || '').length,
              requestHeaders: meta.headers, requestBody: safe(meta.body),
              responseHeaders: respHeaders, responseBody: safe(respBody)
            }
          });
        });

        this.addEventListener('error', function() {
          send({
            type: 'network',
            payload: {
              requestId: meta.requestId, url: meta.url, method: meta.method,
              status: 0, statusText: 'XHR Error',
              duration: Math.round(performance.now() - meta.startTime),
              error: 'Request failed',
              requestHeaders: meta.headers, requestBody: safe(meta.body)
            }
          });
        });

        this.addEventListener('timeout', function() {
          send({
            type: 'network',
            payload: {
              requestId: meta.requestId, url: meta.url, method: meta.method,
              status: 0, statusText: 'Timeout',
              duration: Math.round(performance.now() - meta.startTime),
              error: 'Request timed out',
              requestHeaders: meta.headers, requestBody: safe(meta.body)
            }
          });
        });
      }
      return origSend.apply(this, arguments);
    };
  }

  // Capture errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function(e) {
      send({ type: 'error', payload: { message: e.message, filename: e.filename, lineno: e.lineno, stack: e.error && e.error.stack } });
    });
    window.addEventListener('unhandledrejection', function(e) {
      send({ type: 'error', payload: { message: (e.reason && e.reason.message) || 'Unhandled Promise Rejection', stack: e.reason && e.reason.stack } });
    });
  }

  connect();

  // Global API (works in browser, React Native, Node.js)
  g.consolewatch = {
    log: function(type, data) { send({ type: 'custom', payload: { eventType: type, data: safe(data) } }); },
    benchmark: function(name) {
      var start = performance.now();
      return function() { send({ type: 'benchmark', payload: { name: name, duration: Math.round(performance.now() - start) } }); };
    },
    // Redux middleware for state tracking
    trackRedux: function(store) {
      if (!store || typeof store.getState !== 'function') {
        console.error('[ConsoleWatch] trackRedux requires a Redux store. Usage: applyMiddleware(consolewatch.trackRedux(store))');
        return function(next) { return function(action) { return next(action); }; };
      }
      return function(next) {
        return function(action) {
          var prevState = store.getState();
          var result = next(action);
          var nextState = store.getState();
          send({
            type: 'state',
            payload: {
              storeName: 'Redux',
              actionType: action.type || 'unknown',
              action: safe(action),
              prevState: safe(prevState),
              nextState: safe(nextState)
            }
          });
          return result;
        };
      };
    },
    // Zustand subscription for state tracking
    trackZustand: function(store, name) {
      if (!store || typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
        console.error('[ConsoleWatch] trackZustand requires a Zustand store. Usage: consolewatch.trackZustand(useMyStore, "StoreName")');
        return function() {};
      }
      var prevState = safe(store.getState());
      return store.subscribe(function(nextState) {
        var serialized = safe(nextState);
        send({
          type: 'state',
          payload: {
            storeName: name || 'Zustand',
            actionType: 'state_change',
            prevState: prevState,
            nextState: serialized
          }
        });
        prevState = serialized;
      });
    }
  };
})();
