// ZOMBULAR ed. 15, 2018-06-25, ML

import * as cito from './cito.js';
import * as utils from './utils.js';

/*
    Usage: z.Node(document.body, func)

    func(ctx: {update, ...}, old: cito struct) -> cito struct
    z(spec: str | dict, ...children: [str | num | bool | func]) -> func
    
    update() => schedule an update
    update(fn: callable) => schedule an update, queue fn call after it finishes
    update(true) => update immediately
    
    Calls to update(false, ctx), update(true, ctx) and update(fn, ctx) change
    the initial context by updating it from ctx parameter.
    
    Calls to update during the update phase (i.e. directly from func's, 
    childern of z) have no effect. Function update() must be called 
    from callbacks.
*/

function Node(dom, func) {
    var vnode, queue = [], ctx = {update};    
    var updating = false;
    var performUpdate = utils.throttled(0, function() {
        updating = true;
        if (vnode) cito.vdom.update(vnode, old => func(ctx, old));
        else vnode = cito.vdom.append(dom, old => func(ctx, old));
        utils.callQueue(queue);
        ctx = {update};
        updating = false;
    });
    function update(arg, nctx={}) {
        ctx = Object.assign(ctx, nctx);
        var force = false;
        if (typeof arg === 'function') { queue.push(arg); }
        else if (arg === true) { force = true; }
        if (!updating) performUpdate(force);
    }
    performUpdate(true);    
    return {vnode, update, set: f => func = f};
};

function flatten(array, func, ctx, old) {
    return [].concat(...array.map(elem => func(elem, ctx, old)));
}

function toStringList(v, ctx, old) {
    if (v !== 0 && !v) return [];
    else if (typeof v === 'string') return [v];
    else if (typeof v === 'function') return (old) => toStringList(v(ctx, old), ctx, old);
    else if (typeof v === 'object') {
        if (Array.isArray(v)) {
            return flatten(v, toStringList, ctx, old);
        } else {
            var result = [];
            for (k in v) if (v.hasOwnProperty(k)) {
                if (utils.val(v[k])) result.push(k);                    
            }
            return result;
        }
    } 
    else return [String(v)];
}

function parseSpec(spec, ctx, old) {
    spec = utils.val(spec, ctx, old);
    if (typeof spec === 'string') {
        if (spec === '<' || spec === '!') { return {tag: spec}; } 
        else if (spec === '') { return {}; } 
        else { spec = {is: spec}; }
    }
    // spec -> tag, id, classes
    if (typeof spec !== 'object') return {};
    spec.is = utils.val(spec.is, ctx, old);
    var result = {tag: 'div', attrs: {}, events: {}}, 
        classes = [];
    var specre = /(^([0-9a-z\-_]+)|[<!])|([#\.]?[0-9a-z\-_]+)/gi;
    if (spec.is) {
        (spec.is.match(specre) || []).forEach(function (m) {
            if (m.charAt(0) == '.') classes.push(m.substr(1));
            else if (m.charAt(0) == '#') result.attrs.id = m.substr(1);
            else result.tag = m;
        });
    }
    // key, class, on*, * -> attrs.key, attrs.class, events.*, attrs.*
    for (var key in spec) if (spec.hasOwnProperty(key) && (key !== 'is')) {
        if (key.substr(0, 2) === 'on' && spec[key]) {
            result.events[key.substr(2)] = spec[key];
        } else {
            var nval = utils.val(spec[key], ctx, old);
            if (nval === undefined) continue;
            if (key === 'key') {
                result.key = nval;
            } else if (key === 'class') {
                classes = classes.concat(toStringList(nval, ctx, old));
            } else {
                result.attrs[key] = nval;
            }
        }
    }
    if (classes.length > 0) result.attrs['class'] = classes.join(' ');
    return result;
}

function normChild(c, ctx, old) {
    if (c === undefined || c === null) return c;
    else if (typeof c === 'number') { return String(c); }
    else if (typeof c === 'function') { return (old) => normChild(c(ctx, old), ctx, old); }
    else if (Array.isArray(c)) { return flatten(c, normChild, ctx, old); }
    else { return c; }
}

function z(spec, ...children) {
    return function(ctx, old) {
        var result = parseSpec(spec, ctx, old);
        result.children = normChild(children, ctx, old);
        return result;
    }
}

function Val(v) {
    var result = () => v;
    result.get = result;
    result.set = vv => v = vv;
    return result;
}

function Ref(env, name) {
    var result = () => env[name];
    result.get = result;
    result.set = vv => env[name] = vv;
    return result;
}

export default Object.assign(z, {Node, Val, Ref, each: utils.each});


