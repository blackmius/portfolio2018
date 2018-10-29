// ZOMBULAR ed. 15, 2018-06-25, ML

export function each(list, func, between) {
    var result = [];
    for (var i = 0; i < list.length; i++) {
        var item = func(list[i], i, list);
        if (item != null) {
            result.push(item);
            if (between != undefined) result.push(between);
        }
    }
    if (between != undefined) result.pop();
    return result;
}
    
export function val(f, ...args) {
    return (typeof f === 'function') ? f(...args) : f;
}

export function nonreentrant(fn) {
    var inProgress = false;
    return function() {
        if (inProgress) return;
        inProgress = true;
        try {
            var result = fn();
        } finally {
            inProgress = false;
        }
        return result;
    }
}

export function throttled(delay, fn) {
    var handle;
    function perform() {
        if (handle !== undefined) clearTimeout(handle);
        handle = undefined;
        return fn();
    }
    return function(force) {
        if (force) return perform();
        handle = setTimeout(perform, delay);
    }
}

export function callQueue(q) {
    while (q.length > 0) {
        try {
            q.shift()();
        } catch(err) {
            console.error(err);
        }
    }
}

