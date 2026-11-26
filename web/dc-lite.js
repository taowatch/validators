/*
 * dc-lite: a ~150-line runtime for the design's .dc.html templates.
 *
 * Supports what design/Main.dc.html uses:
 *   {{ path }} in text and attributes (whole-value → raw value, mixed → string),
 *   <sc-if value>, <sc-for list as> (with $index), onX="{{ fn }}" event bindings,
 *   value="{{ x }}" on inputs (set as a property), and a DCLogic base class with
 *   props / state / setState / componentDidMount / componentWillUnmount.
 *
 * Each render builds a light vnode tree from the <template> and patches the live DOM
 * by position, so focused inputs, scroll and hover survive re-renders.
 *
 * Safety: text goes in as text nodes, attributes through setAttribute; on* / data-on-*
 * attributes are never written to the DOM (only {{fn}} bindings become listeners), and URL attributes keep
 * only safe schemes (see safeUrl), so data from the chain can't become script.
 */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(update) {
      const patch = typeof update === 'function' ? update(this.state, this.props) : update;
      this.state = Object.assign({}, this.state, patch);
      if (this.__schedule) this.__schedule();
    }
    forceUpdate() {
      if (this.__schedule) this.__schedule();
    }
  }

  const WHOLE = /^\s*\{\{([^}]+)\}\}\s*$/;
  const ANY = /\{\{([^}]+)\}\}/g;

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let cur = scope;
    for (const k of path.split('.')) {
      if (cur == null) return undefined;
      cur = cur[k];
    }
    return cur;
  }

  function interp(str, scope) {
    return str.replace(ANY, (_, p) => {
      const v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function attrValue(el, name, scope) {
    const raw = el.getAttribute(name);
    if (raw == null) return undefined;
    const m = raw.match(WHOLE);
    return m ? lookup(scope, m[1]) : raw;
  }

  // URL-valued attributes: links may be relative, #fragment, http(s) or mailto; resources
  // (src, poster…) only relative or https. Anything else (javascript:, data:, vbscript:…) is
  // dropped.
  const LINK_ATTRS = { href: 1, action: 1, formaction: 1, 'xlink:href': 1 };
  const RES_ATTRS = { src: 1, poster: 1, srcset: 1 };
  function safeUrl(name, value) {
    if (!LINK_ATTRS[name] && !RES_ATTRS[name]) return value;
    const v = String(value).trim();
    // strip whitespace/control chars browsers ignore inside a scheme, then read the scheme
    const m = v.replace(/[\u0000-\u0020]/g, '').match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (!m) return v; // relative, #fragment, ?query
    const scheme = m[1].toLowerCase();
    if (RES_ATTRS[name]) return scheme === 'https' ? v : null;
    return scheme === 'http' || scheme === 'https' || scheme === 'mailto' ? v : null;
  }

  // HTML parsing lower-cases attribute names: onClick → onclick. tools/dc2web.py writes event
  // bindings as data-on-click (Chrome reports even inert on* attributes in a <template> as CSP
  // violations); both spellings bind the same way.
  const EVENT_ATTR = /^(?:data-)?on-?([a-z]+)$/;
  function eventType(attr, tag) {
    const t = attr.match(EVENT_ATTR)[1];
    if (t === 'change' && (tag === 'input' || tag === 'textarea')) return 'input'; // React onChange semantics
    return t;
  }

  function build(nodes, scope, out) {
    for (const n of nodes) {
      if (n.nodeType === 3) {
        const t = n.nodeValue;
        out.push({ text: t.indexOf('{{') >= 0 ? interp(t, scope) : t });
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.localName;
      if (tag === 'sc-if') {
        if (attrValue(n, 'value', scope)) build(n.childNodes, scope, out);
        continue;
      }
      if (tag === 'sc-for') {
        const list = attrValue(n, 'list', scope) || [];
        const as = n.getAttribute('as') || 'item';
        for (let i = 0; i < list.length; i++) {
          const s = Object.create(scope);
          s[as] = list[i];
          s.$index = i;
          build(n.childNodes, s, out);
        }
        continue;
      }
      const vn = { tag, ns: n.namespaceURI, attrs: {}, on: {}, value: undefined, hasValue: false, children: [] };
      for (const a of Array.from(n.attributes)) {
        const name = a.name, val = a.value;
        if (name.startsWith('hint-')) continue;
        const whole = val.match(WHOLE);
        if (/^on[a-z]+$/.test(name) || /^data-on-[a-z]+$/.test(name)) {
          // only {{fn}} bindings become listeners; inline handler code is never written
          if (whole) {
            const fn = lookup(scope, whole[1]);
            if (typeof fn === 'function') vn.on[eventType(name, tag)] = fn;
          }
          continue;
        }
        if (whole) {
          const v = lookup(scope, whole[1]);
          if (name === 'value') {
            vn.value = v;
            vn.hasValue = true;
            continue;
          }
          if (v == null || (v === false && !name.startsWith('aria-'))) continue;
          const safe = safeUrl(name, String(v));
          if (safe != null) vn.attrs[name] = safe;
        } else {
          const safe = safeUrl(name, val.indexOf('{{') >= 0 ? interp(val, scope) : val);
          if (safe != null) vn.attrs[name] = safe;
        }
      }
      build(n.childNodes, scope, vn.children);
      out.push(vn);
    }
    return out;
  }

  function patch(parent, vnodes) {
    const kids = parent.childNodes;
    for (let i = 0; i < vnodes.length; i++) {
      const v = vnodes[i];
      let el = kids[i];
      if (v.text !== undefined) {
        if (el && el.nodeType === 3) {
          if (el.nodeValue !== v.text) el.nodeValue = v.text;
        } else {
          const t = document.createTextNode(v.text);
          el ? parent.replaceChild(t, el) : parent.appendChild(t);
        }
        continue;
      }
      if (!el || el.nodeType !== 1 || el.localName !== v.tag || el.namespaceURI !== v.ns) {
        const ne = document.createElementNS(v.ns, v.tag);
        el ? parent.replaceChild(ne, el) : parent.appendChild(ne);
        el = ne;
      }
      const old = el.__a || {};
      for (const k in old) if (!(k in v.attrs)) el.removeAttribute(k);
      for (const k in v.attrs) if (old[k] !== v.attrs[k]) el.setAttribute(k, v.attrs[k]);
      el.__a = v.attrs;

      el.__h = v.on;
      el.__l = el.__l || {};
      for (const type in v.on) {
        if (!el.__l[type]) {
          el.__l[type] = true;
          const target = el;
          el.addEventListener(type, (e) => {
            const f = target.__h && target.__h[type];
            if (f) f(e);
          });
        }
      }
      // children first: a <select>'s value can only match once its <option>s exist
      patch(el, v.children);
      if (v.hasValue) {
        const s = v.value == null ? '' : String(v.value);
        if (el.value !== s) el.value = s;
      }
    }
    while (kids.length > vnodes.length) parent.removeChild(parent.lastChild);
  }

  function mount(Component, template, root, props) {
    const c = new Component(props || {});
    c.state = c.state || {};
    let pending = false;
    const render = () => {
      pending = false;
      patch(root, build(template.content.childNodes, c.renderVals(), []));
    };
    c.__schedule = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(render);
      }
    };
    render();
    if (c.componentDidMount) c.componentDidMount();
    window.addEventListener('pagehide', () => c.componentWillUnmount && c.componentWillUnmount());
    return c;
  }

  window.DCLogic = DCLogic;
  window.DCMount = mount;
})();
