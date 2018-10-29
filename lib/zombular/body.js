// ZOMBULAR ed. 15, 2018-06-25, ML

import z from './zombular.js';

/*
  Usage: as an extension of z-combinator.
  
  z.setBody(func)
  - func generates page body on each route change
  
  z.update()
  - performs an update of page body
  
  z.route() 
  - returns a current route as a {route, args} object
  
  z.route([path,] args)
  - A reverse of z.route() call. If that one can be thought of as a getter, 
    this one is a setter. `args` is an object of the form {arg1: val1, ...}
    All values are strings, beacuse we are dealing with URL parameters.
    Returns an URL you can use in `location.assign` or `location.replace`.
    URL format is `#path;arg1=val1;arg2=val2`.
    If `path` is null, the URL to update the arguments of the current route 
    is returned.
  
  z._tag([spec])
  z._tag([spec,] ...children)
  z.class([spec])
  z.class([spec,] ...children)
  - Shorthand notation for z('tag', ...children) or z('.class', ...children)
  
  NB: To avoid ambiguity, for a shorthand notation, the first argument 
  can not be a function returning a spec, as a normal z-combinator call allows.
  Otherwise, z._div(z._div('a')) is indistinguishable from
  z._div(()=>{is: '.quote'}, 'a') by types of arguments.
*/

var _route, _args;

function route(r, args={}) {
    if (r === undefined) return {route: _route, args: _args};
    if (r === null) { 
        args = Object.assign({}, _args, args);
        r = _route;
    }
    var result = [r];
    Object.entries(args).forEach(([k, v]) => {
        if (v !== undefined)
          result.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return '#'+result.join(';');
}

function updateRoute() {
    var hash = window.location.hash.slice(1);
    var pairs;
    [_route, ...pairs] = hash.split(';');
    _args = {};
    pairs.forEach(p => {
        var [key, ...values] = p.split('=');
        _args[decodeURIComponent(key)] = decodeURIComponent(values.join('='));
    });    
}

updateRoute();

function extendSpecString(prefix='', spec='') {    
    if (spec.startsWith('.')) return prefix + spec;
    if (prefix.startsWith('.')) return spec + prefix;
    if (prefix === '') return spec;
    return spec + '.' + prefix;
}

function extendSpec(prefix='', spec) {
    let is = spec.is, is_ = is;
    if (typeof is === 'string') {
        is_ = extendSpecString(prefix, is);
    } else if (typeof is === 'function') {
        is_ = ctx => extendSpecString(prefix, is(ctx));
    } else if (is === undefined) {
        is_ = prefix;
    }
    spec.is = is_;
    return spec;
}

function withPrefix(prefix='') {
    return new Proxy(()=>{}, {
        get(self, prop) {
            if (prop in self) return self[prop];
            if (prop in z) return z[prop];
            let newPrefix = (prefix === '' && prop.startsWith('_')) ? 
              prop.replace(/^_/, '') :
              prefix + '.' + prop;
            return withPrefix(newPrefix);
        },
        apply(self, handler, args) {
            if (prefix !== '') {
                let spec = args[0];
                if (typeof spec === 'object' && !Array.isArray(spec)) {
                    args[0] = extendSpec(prefix, spec);
                } else {
                    args.unshift(prefix);
                }
            }
            return z(...args);
        },
    });
}

let body = z.Node(document.body, z(''));
window.addEventListener('hashchange', () => { 
    updateRoute(); 
    body.update(); 
});

export default Object.assign(withPrefix(), { 
  setBody: f => {
      body.set(f); 
      body.update(true);
  },
  update: body.update,
  route,
  _: (...args) => z('', ...args),
});

