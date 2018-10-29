(function () {
    'use strict';

    /*
     * Copyright (c) 2015, Joel Richard
     *
     * This Source Code Form is subject to the terms of the Mozilla Public
     * License, v. 2.0. If a copy of the MPL was not distributed with this
     * file, You can obtain one at http://mozilla.org/MPL/2.0/.
     */

        // TODO implement parse utility which leverages createContextualFragment

        var document$1 = window.document,
            navigator = window.navigator,
            noop = function () {},
            console$1 = window.console || {warn: noop, error: noop};

        var userAgent = navigator.userAgent,
            isWebKit = userAgent.indexOf('WebKit') !== -1,
            isFirefox = userAgent.indexOf('Firefox') !== -1,
            isTrident = userAgent.indexOf('Trident') !== -1;

        var helperDiv = document$1.createElement('div'),
            supportsTextContent = 'textContent' in document$1,
            supportsEventListener = 'addEventListener' in document$1,
            supportsRange = 'createRange' in document$1,
            supportsCssSetProperty = 'setProperty' in helperDiv.style;

        function isString(value) {
            return typeof value === 'string';
        }

        function isArray(value) {
            return value instanceof Array;
        }

        function isFunction(value) {
            return typeof value === 'function';
        }

        function norm(node, oldNode) {
            var type = typeof node;
            if (type === 'string') {
                node = {tag: '#', children: node};
            } else if (type === 'function') {
                node = node(oldNode);
                node = (node === undefined) ? oldNode : norm(node, oldNode);
            }
            return node;
        }

        function normOnly(node, origChild, oldChild) {
            var child = norm(origChild, oldChild);
            if (origChild !== child && node) {
                node.children = child;
            }
            return child;
        }

        function normOnlyOld(children, childrenType, domElement) {
            var child = normOnly(null, getOnlyChild(children, childrenType));
            if (!child.dom) {
                child.dom = domElement.firstChild;
                if (child.tag === '<') {
                    child.domLength = domElement.childNodes.length;
                }
            }
            return child;
        }

        function normIndex(children, i, oldChild) {
            var origChild = children[i],
                child = norm(origChild, oldChild);
            if (origChild !== child) {
                children[i] = child;
            }
            return child;
        }

        function normChildren(node, children, oldChildren) {
            if (isFunction(children)) {
                children = children(oldChildren);
                if (children === undefined) {
                    children = oldChildren;
                }
                node.children = children;
            }
            return children;
        }

        function getOnlyChild(children, childrenType) {
            return (childrenType === 1) ? children[0] : children;
        }

        function moveChild(domElement, child, nextChild) {
            var domChild = child.dom, domLength = child.domLength || 1,
                domNextChild,
                domRefChild = nextChild && nextChild.dom;
            if (domChild !== domRefChild) {
                while (domLength--) {
                    domNextChild = (domLength > 0) ? domChild.nextSibling : null;
                    if (domRefChild) {
                        domElement.insertBefore(domChild, domRefChild);
                    } else {
                        domElement.appendChild(domChild);
                    }
                    domChild = domNextChild;
                }
            }
        }
        
        // TODO find solution without empty text placeholders
        function emptyTextNode() {
            return document$1.createTextNode('');
        }

        var iah_el = document$1.createElement('p'), iah_normalizes, iah_ignoresEmptyText;
        if (iah_el.insertAdjacentHTML) {
            iah_el.appendChild(document$1.createTextNode('a'));
            iah_el.insertAdjacentHTML('beforeend', 'b');
            iah_normalizes = (iah_el.childNodes.length === 1);

            iah_el = document$1.createElement('p');
            iah_el.appendChild(emptyTextNode());
            iah_el.insertAdjacentHTML('beforeend', '<b>');
            iah_ignoresEmptyText = (iah_el.firstChild.nodeType !== 3);
        }

        function insertAdjacentHTML(node, position, htmlContent) {
            if (node.insertAdjacentHTML) {
                var prevText, prevTextLength, prevTextEmpty;
                if (iah_normalizes || iah_ignoresEmptyText) {
                    var prevNode = (position === 'beforebegin') ? node.previousSibling
                        : (position === 'beforeend') ? node.lastChild : null;
                    if (prevNode && prevNode.nodeType === 3) {
                        prevText = prevNode;
                        if (iah_ignoresEmptyText && prevNode.length === 0) {
                            prevTextEmpty = true;
                            prevNode.nodeValue = ' ';
                        }
                        if (iah_normalizes) {
                            prevTextLength = prevNode.length;
                        }
                    }
                }
                node.insertAdjacentHTML(position, htmlContent);
                if (prevText) {
                    // Split previous text node if it was updated instead of a new one inserted (IE/FF)
                    if (iah_normalizes && prevText.length !== prevTextLength) {
                        prevText.splitText(prevTextLength);
                    }
                    if (iah_ignoresEmptyText && prevTextEmpty) {
                        prevText.nodeValue = '';
                    }
                }
            } else {
                helperDiv.innerHTML = htmlContent;
                if (position === 'beforebegin') {
                    var parentNode = node.parentNode;
                    while (helperDiv.firstChild) {
                        parentNode.insertBefore(helperDiv.firstChild, node);
                    }
                } else if (position === 'beforeend') {
                    while (helperDiv.firstChild) {
                        node.appendChild(helperDiv.firstChild);
                    }
                }
            }
        }

        function insertChild(domParent, domNode, nextChild, replace) {
            if (nextChild) {
                var domNextChild = nextChild.dom;
                if (replace) {
                    var domLength = nextChild.domLength || 1;
                    if (domLength === 1) {
                        destroyNode(nextChild);
                        domParent.replaceChild(domNode, domNextChild);
                    } else {
                        domParent.insertBefore(domNode, domNextChild);
                        removeChild(domParent, nextChild);
                    }
                } else {
                    domParent.insertBefore(domNode, domNextChild);
                }
            } else {
                domParent.appendChild(domNode);
            }
        }

        function createNode(node, domParent, parentNs, nextChild, replace, isOnlyDomChild) {
            if (isTrident) {
                return insertNodeHTML(node, domParent, nextChild, replace);
            }

            var domNode, tag = node.tag, children = node.children;
            switch (tag) {
                case undefined:
                    return createFragment(node, children, domParent, parentNs, nextChild, replace);
                case '#':
                    if (isOnlyDomChild) {
                        setTextContent(domParent, children);
                        return;
                    } else {
                        domNode = document$1.createTextNode(children);
                    }
                    break;
                case '!':
                    domNode = document$1.createComment(children);
                    break;
                case '<':
                    if (children) {
                        if (isOnlyDomChild) {
                            domParent.innerHTML = children;
                        } else {
                            var domChildren = domParent.childNodes,
                                prevLength = domChildren.length;
                            if (nextChild) {
                                var domNextChild = nextChild.dom,
                                    domPrevChild = domNextChild.previousSibling;
                                insertAdjacentHTML(domNextChild, 'beforebegin', children);
                                domNode = domPrevChild ? domPrevChild.nextSibling : domParent.firstChild;
                            } else {
                                insertAdjacentHTML(domParent, 'beforeend', children);
                                domNode = domChildren[prevLength];
                            }
                            node.dom = domNode;
                            node.domLength = domChildren.length - prevLength;
                            if (replace && nextChild) {
                                // TODO use outerHTML instead
                                removeChild(domParent, nextChild);
                            }
                        }
                        return;
                    } else {
                        domNode = emptyTextNode();
                    }
                    break;
                default:
                    var ns;
                    switch (tag) {
                        case 'svg': ns = 'http://www.w3.org/2000/svg'; break;
                        case 'math': ns = 'http://www.w3.org/1998/Math/MathML'; break;
                        default: ns = parentNs; break;
                    }

                    var attrs = node.attrs,
                        is = attrs && attrs.is;
                    if (ns) {
                        node.ns = ns;
                        domNode = is ? document$1.createElementNS(ns, tag, is) : document$1.createElementNS(ns, tag);
                    } else {
                        domNode = is ? document$1.createElement(tag, is) : document$1.createElement(tag);
                    }
                    node.dom = domNode;
                    if (isTrident && domParent) {
                        insertChild(domParent, domNode, nextChild, replace);
                    }

                    if (typeof children === 'string') {
                        setTextContent(domNode, children, false);
                    } else {
                        createAllChildren(domNode, node, ns, children, false);
                    }

                    if (attrs) {
                        updateAttributes(domNode, tag, ns, attrs);
                    }
                    var events = node.events;
                    if (events) {
                        updateEvents(domNode, node, events);
                    }
                    if (!isTrident && domParent) {
                        insertChild(domParent, domNode, nextChild, replace);
                    }

                    var createdHandlers = events && events.$created;
                    if (createdHandlers) {
                        triggerLight(createdHandlers, '$created', domNode, node);
                    }
                    return;
            }
            node.dom = domNode;
            if (domParent) {
                insertChild(domParent, domNode, nextChild, replace);
            }
        }

        function triggerLight(handlers, type, domNode, node, extraProp, extraPropValue) {
            var event = {type: type, target: domNode, virtualNode: node};
            if (extraProp) {
                event[extraProp] = extraPropValue;
            }
            if (isArray(handlers)) {
                for (var i = 0; i < handlers.length; i++) {
                    if (handlers[i].call(domNode, event) === false) {
                        return;
                    }
                }
            } else {
                handlers.call(domNode, event);
            }
        }

        function insertNodeHTML(node, domParent, nextChild, replace) {
            var html = createNodeHTML(node), domNode;
            if (domParent) {
                var prevNode;
                if (!nextChild && !domParent.hasChildNodes()) {
                    domParent.innerHTML = html;
                    domNode = domParent.firstChild;
                } else {
                    if (nextChild) {
                        prevNode = nextChild.dom.previousSibling;
                        insertAdjacentHTML(nextChild.dom, 'beforebegin', html);
                        if (replace) {
                            // TODO use outerHTML instead
                            removeChild(domParent, nextChild);
                        }
                    } else {
                        prevNode = domParent.lastChild;
                        insertAdjacentHTML(domParent, 'beforeend', html);
                    }
                    domNode = prevNode ? prevNode.nextSibling : domParent.firstChild;
                }
            } else {
                helperDiv.innerHTML = html;
                domNode = helperDiv.removeChild(helperDiv.firstChild);
            }
            initVirtualDOM(domNode, node);
        }

        var endOfText = '\u0003';

        // FIXME namespace issue in FF
        // TODO omit all unnecessary endOfText
        function createNodeHTML(node, context) {
            var tag = node.tag, children = node.children;
            switch (tag) {
                case '#':
                    return escapeContent(children) + endOfText;
                case '!':
                    return '<!--' + escapeComment(children) + '-->';
                case '<':
                    return children + endOfText;
                default:
                    var html;
                    if (tag) {
                        var attrs = node.attrs;
                        if (tag === 'select' && attrs) {
                            context = {selectedIndex: attrs.selectedIndex, value: attrs.value, optionIndex: 0};
                        } else if (tag === 'option' && context) {
                            if ((context.value && context.value === attrs.value) ||
                                (context.selectedIndex !== undefined && context.selectedIndex === context.optionIndex)) {
                                attrs.selected = true;
                            }
                            context.optionIndex++;
                        }
                        // TODO validate tag name
                        html = '<' + tag;
                        if (attrs) {
                            html += ' ';
                            for (var attrName in attrs) {
                                var attrValue = attrs[attrName];
                                if (attrValue === false ||
                                    (tag === 'select' && (attrName === 'value' || attrName === 'selectedIndex'))) {
                                    continue;
                                } else if (tag === 'textarea' && attrName === 'value') {
                                    children = attrValue;
                                    continue;
                                } else if (attrValue === true) {
                                    attrValue = '';
                                } else if (attrName === 'style' && !isString(attrValue)) {
                                    var style = '';
                                    for (var propName in attrValue) {
                                        style += propName + ': ' + attrValue[propName] + '; ';
                                    }
                                    attrValue = style;
                                }
                                html += ' ' + escapedAttr(attrName, attrValue);
                            }
                        }
                    } else {
                        html = '';
                    }
                    if (tag) {
                        html += '>';
                    }

                    children = normChildren(node, children);
                    var childrenType = getChildrenType(children);
                    if (childrenType > 1) {
                        for (var i = 0, childrenLength = children.length; i < childrenLength; i++) {
                            html += createNodeHTML(normIndex(children, i), context);
                        }
                    } else if (childrenType !== 0) {
                        var child = getOnlyChild(children, childrenType);
                        if (isString(child)) {
                            html += escapeContent(child);
                            if (!tag || !child) {
                                html += endOfText;
                            }
                        } else {
                            html += createNodeHTML(normOnly(node, child), context);
                        }
                    } else if (!tag) {
                        html += endOfText;
                    }
                    if (tag) {
                        // TODO close only required tags explicitly
                        html += '</' + tag + '>';
                    }
                    return html;
            }
        }

        // TODO only use indexOf + splitText when necessary
        function initVirtualDOM(domNode, node) {
            var tag = node.tag;
            if (tag) {
                node.dom = domNode;
                var text, endIndex;
                switch (tag) {
                    case '#':
                        text = domNode.nodeValue;
                        endIndex = text.indexOf(endOfText);
                        if (endIndex !== -1) {
                            if (endIndex + 1 < text.length) {
                                domNode.splitText(endIndex + 1);
                            }
                            domNode.nodeValue = text.substr(0, endIndex);
                        }
                        break;
                    case '!': break;
                    case '<':
                        var domLength = 0, nextDomNode;
                        for (; domNode; domNode = domNode.nextSibling) {
                            domLength++;
                            if (domNode.nodeType === 3) {
                                text = domNode.nodeValue;
                                if (domLength > 1 && text === endOfText) {
                                    nextDomNode = domNode.nextSibling;
                                    domNode.parentNode.removeChild(domNode);
                                    domLength--;
                                    break;
                                } else {
                                    endIndex = text.indexOf(endOfText);
                                    if (endIndex !== -1) {
                                        if (endIndex + 1 < text.length) {
                                            domNode.splitText(endIndex + 1);
                                        }
                                        domNode.nodeValue = text.substr(0, endIndex);
                                        nextDomNode = domNode.nextSibling;
                                        break;
                                    }
                                }
                            }
                        }
                        node.domLength = domLength;
                        return nextDomNode;
                    default:
                        var children = node.children,
                            childrenType = getChildrenType(children);
                        if (childrenType > 1) {
                            children = node.children;
                            var childDomNode = domNode.firstChild;
                            for (var i = 0, childrenLength = children.length; i < childrenLength; i++) {
                                childDomNode = initVirtualDOM(childDomNode, children[i]);
                            }
                        } else if (childrenType !== 0) {
                            var child = getOnlyChild(children, childrenType);
                            if (!isString(child)) {
                                initVirtualDOM(domNode.firstChild, child);
                            } else if (!child) {
                                domNode.firstChild.nodeValue = '';
                            }
                        }

                        var events = node.events;
                        if (events) {
                            updateEvents(domNode, node, events);

                            var createdHandlers = events.$created;
                            if (createdHandlers) {
                                triggerLight(createdHandlers, '$created', domNode, node);
                            }
                        }
                        break;
                }
                return domNode.nextSibling;
            } else {
                return initVirtualDOMFragment(domNode, node);
            }
        }

        function initVirtualDOMFragment(domNode, node) {
            var children = node.children,
                childrenType = getChildrenType(children),
                nextDomNode;
            if (childrenType === 0) {
                if (domNode.length > 1) {
                    domNode.splitText(1);
                }
                domNode.nodeValue = '';
                node.dom = domNode;
                nextDomNode = domNode.nextSibling;
            } else {
                if (childrenType > 1) {
                    nextDomNode = domNode;
                    for (var i = 0; i < children.length; i++) {
                        nextDomNode = initVirtualDOM(nextDomNode, children[i]);
                    }
                    domNode = children[0].dom;
                } else {
                    var child = normOnly(node, getOnlyChild(children, childrenType));
                    nextDomNode = initVirtualDOM(domNode, child);
                    domNode = child.dom;
                }
                node.dom = domNode;

                var domLength = 0;
                while (domNode !== nextDomNode) {
                    domLength++;
                    domNode = domNode.nextSibling;
                }
                node.domLength = domLength;
            }
            return nextDomNode;
        }

        function escapeContent(value) {
            value = '' + value;
            if (isWebKit) {
                helperDiv.innerText = value;
                value = helperDiv.innerHTML;
            } else if (isFirefox) {
                value = value.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
            } else {
                value = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            return value;
        }

        function escapeComment(value) {
            value = '' + value;
            return value.replace(/-{2,}/g, '-');
        }

        function escapedAttr(name, value) {
            var type = typeof value;
            value = '' + value;
            if (type !== 'number') {
                if (isFirefox) {
                    value = value.split('&').join('&amp;').split('"').join('&quot;');
                } else {
                    value = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                }
            }
            // TODO validate attribute name
            return name + '="' + value + '"';
        }

        function createFragment(node, children, domParent, parentNs, nextChild, replace) {
            children = normChildren(node, children);
            var childrenType = getChildrenType(children);

            var domNode, domLength, child;
            if (parentNs) {
                node.ns = parentNs;
            }
            if (childrenType === 0) {
                domNode = emptyTextNode();
                insertChild(domParent, domNode, nextChild, replace);
            } else if (childrenType > 1) {
                domLength = 0;
                for (var i = 0, childrenLength = children.length; i < childrenLength; i++) {
                    child = normIndex(children, i);
                    createNode(child, domParent, parentNs, nextChild, false);
                    domLength += child.domLength || 1;
                }
                domNode = children[0].dom;
                if (replace) {
                    removeChild(domParent, nextChild);
                }
            } else {
                child = normOnly(node, getOnlyChild(children, childrenType));
                createNode(child, domParent, parentNs, nextChild, replace);
                domNode = child.dom;
                domLength = child.domLength;
            }
            node.dom = domNode;
            node.domLength = domLength;
        }

        function updateAttributes(domElement, tag, ns, attrs, oldAttrs, recordChanges) {
            var changes, attrName;
            if (attrs) {
                for (attrName in attrs) {
                    var changed = false,
                        attrValue = attrs[attrName];
                    if (attrName === 'style') {
                        var oldAttrValue = oldAttrs && oldAttrs[attrName];
                        if (oldAttrValue !== attrValue) {
                            changed = updateStyle(domElement, oldAttrValue, attrs, attrValue);
                        }
                    } else if (isInputProperty(tag, attrName)) {
                        if (domElement[attrName] !== attrValue) {
                            domElement[attrName] = attrValue;
                            changed = true;
                        }
                    } else if (!oldAttrs || oldAttrs[attrName] !== attrValue) {
                        if (attrName === 'class' && !ns) {
                            domElement.className = attrValue;
                        } else {
                            updateAttribute(domElement, attrName, attrValue);
                        }
                        changed = true;
                    }
                    if (changed && recordChanges) {
                        (changes || (changes = [])).push(attrName);
                    }
                }
            }
            if (oldAttrs) {
                for (attrName in oldAttrs) {
                    if ((!attrs || attrs[attrName] === undefined)) {
                        if (attrName === 'class' && !ns) {
                            domElement.className = '';
                        } else if (!isInputProperty(tag, attrName)) {
                            domElement.removeAttribute(attrName);
                        }
                        if (recordChanges) {
                            (changes || (changes = [])).push(attrName);
                        }
                    }
                }
            }
            return changes;
        }

        function updateAttribute(domElement, name, value) {
            if (value === false) {
                domElement.removeAttribute(name);
            } else {
                if (value === true) {
                    value = '';
                }
                var colonIndex = name.indexOf(':'), ns;
                if (colonIndex !== -1) {
                    var prefix = name.substr(0, colonIndex);
                    switch (prefix) {
                        case 'xlink':
                            ns = 'http://www.w3.org/1999/xlink';
                            break;
                    }
                }
                if (ns) {
                    domElement.setAttributeNS(ns, name, value);
                } else {
                    domElement.setAttribute(name, value);
                }
            }
        }

        function updateStyle(domElement, oldStyle, attrs, style) {
            var changed = false,
                propName;
            if (!isString(style) && (!supportsCssSetProperty || !oldStyle || isString(oldStyle))) {
                var styleStr = '';
                if (style) {
                    for (propName in style) {
                        styleStr += propName + ': ' + style[propName] + '; ';
                    }
                }
                style = styleStr;
                if (!supportsCssSetProperty) {
                    attrs.style = style;
                }
            }
            var domStyle = domElement.style;
            if (isString(style)) {
                domStyle.cssText = style;
                changed = true;
            } else {
                if (style) {
                    for (propName in style) {
                        // TODO should important properties even be supported?
                        var propValue = style[propName];
                        if (!oldStyle || oldStyle[propName] !== propValue) {
                            var importantIndex = propValue.indexOf('!important');
                            if (importantIndex !== -1) {
                                domStyle.setProperty(propName, propValue.substr(0, importantIndex), 'important');
                            } else {
                                if (oldStyle) {
                                    var oldPropValue = oldStyle[propName];
                                    if (oldPropValue && oldPropValue.indexOf('!important') !== -1) {
                                        domStyle.removeProperty(propName);
                                    }
                                }
                                domStyle.setProperty(propName, propValue, '');
                            }
                            changed = true;
                        }
                    }
                }
                if (oldStyle) {
                    for (propName in oldStyle) {
                        if (!style || style[propName] === undefined) {
                            domStyle.removeProperty(propName);
                            changed = true;
                        }
                    }
                }
            }
            return changed;
        }

        function updateEvents(domElement, element, events, oldEvents) {
            var eventType;
            if (events) {
                domElement.virtualNode = element;
                for (eventType in events) {
                    if (!oldEvents || !oldEvents[eventType]) {
                        addEventHandler(domElement, eventType);
                    }
                }
            }
            if (oldEvents) {
                for (eventType in oldEvents) {
                    if (!events || !events[eventType]) {
                        removeEventHandler(domElement, eventType);
                    }
                }
            }
        }

        function isInputProperty(tag, attrName) {
            switch (tag) {
                case 'input':
                    return attrName === 'value' || attrName === 'checked';
                case 'textarea':
                    return attrName === 'value';
                case 'select':
                    return attrName === 'value' || attrName === 'selectedIndex';
                case 'option':
                    return attrName === 'selected';
            }
        }

        function addEventHandler(domElement, type) {
            if (type[0] !== '$') {
                if (supportsEventListener) {
                    domElement.addEventListener(type, eventHandler, false);
                } else {
                    var onType = 'on' + type;
                    if (onType in domElement) {
                        domElement[onType] = eventHandler;
                    } else {
                        // TODO bind element to event handler + tests
                        domElement.attachEvent(onType, eventHandler);
                    }
                }
            }
        }

        function removeEventHandler(domElement, type) {
            if (type[0] !== '$') {
                if (supportsEventListener) {
                    domElement.removeEventListener(type, eventHandler, false);
                } else {
                    var onType = 'on' + type;
                    if (onType in domElement) {
                        domElement[onType] = null;
                    } else {
                        domElement.detachEvent(onType, eventHandler);
                    }
                }
            }
        }

        function createAllChildren(domNode, node, ns, children, inFragment) {
            children = normChildren(node, children);
            var childrenType = getChildrenType(children);
            if (childrenType > 1) {
                for (var i = 0, childrenLength = children.length; i < childrenLength; i++) {
                    createNode(normIndex(children, i), domNode, ns);
                }
            } else if (childrenType !== 0) {
                var child = getOnlyChild(children, childrenType);
                if (!inFragment && isString(child)) {
                    setTextContent(domNode, child);
                } else {
                    child = normOnly(node, child);
                    createNode(child, domNode, ns, null, false, !inFragment);
                }
            }
        }

        function getChildrenType(children) {
            if (isArray(children)) {
                return children.length;
            } else {
                return (children || isString(children)) ? -1 : 0;
            }
        }

        var range = supportsRange ? document$1.createRange() : null;

        function removeAllChildren(domElement, children, childrenType) {
            if (childrenType > 1) {
                removeChildren(domElement, children, 0, children.length);
            } else if (childrenType !== 0) {
                if (isString(children)) {
                    domElement.removeChild(domElement.firstChild);
                } else {
                    removeChild(domElement, normOnlyOld(children, childrenType, domElement));
                }
            }
        }

        function removeChildren(domElement, children, i, to) {
            for (; i < to; i++) {
                removeChild(domElement, children[i]);
            }
            // TODO use range for better performance with many children
            // TODO use setStartBefore/setEndAfter for faster range delete
            /*
             } else if (hasRange && count === children.length) {
                for (i = from; i < to; i++) {
                    destroyNode(children[i]);
                }
                range.selectNodeContents(domElement);
                range.deleteContents();
             */
        }

        function removeChild(domElement, child) {
            destroyNode(child);
            var domChild = child.dom, domLength = child.domLength || 1,
                domNextChild;
            while (domLength-- && domChild) {
                domNextChild = (domLength > 0) ? domChild.nextSibling : null;
                domElement.removeChild(domChild);            
                domChild = domNextChild;
            }
        }

        function setTextContent(domElement, text, update) {
            if (text) {
                if (supportsTextContent) {
                    domElement.textContent = text;
                } else {
                    domElement.innerText = text;
                }
            } else {
                if (update) {
                    while (domElement.firstChild) {
                        domElement.removeChild(domElement.firstChild);
                    }
                }
                domElement.appendChild(emptyTextNode());
            }
        }

        function updateChildren(domElement, element, ns, oldChildren, children, inFragment, outerNextChild) {
            children = normChildren(element, children, oldChildren);
            if (children === oldChildren) {
                return;
            }

            var oldChildrenType = getChildrenType(oldChildren);
            if (oldChildrenType === 0) {
                createAllChildren(domElement, element, ns, children, false);
                return;
            }

            var childrenType = getChildrenType(children),
                oldChild, child;
            if (childrenType === 0) {
                removeAllChildren(domElement, oldChildren, oldChildrenType);
                return;
            } else if (childrenType < 2) {
                child = getOnlyChild(children, childrenType);
                if (!inFragment && isString(child)) {
                    if (childrenType === oldChildrenType) {
                        oldChild = getOnlyChild(oldChildren, oldChildrenType);
                        if (child === oldChild) {
                            return;
                        } else if (isString(oldChild)) {
                            domElement.firstChild.nodeValue = child;
                            return;
                        }
                    }
                    destroyNodes(oldChildren, oldChildrenType);
                    setTextContent(domElement, child, true);
                    return;
                } else if (oldChildrenType < 2) {
                    oldChild = normOnlyOld(oldChildren, oldChildrenType, domElement);
                    child = normOnly(element, child, oldChild);
                    updateNode(oldChild, child, domElement, ns, null, 0, outerNextChild, !inFragment);
                    return;
                }
            }

            if (childrenType === -1) {
                element.children = children = [children];
            }
            if (oldChildrenType < 2) {
                oldChild = normOnlyOld(oldChildren, oldChildrenType, domElement);
                if (oldChildrenType === 1) {
                    oldChildren[0] = oldChild;
                } else {
                    oldChildren = [oldChild];
                }
            }

            var oldChildrenLength = oldChildren.length,
                childrenLength = children.length,
                oldEndIndex = oldChildrenLength - 1,
                endIndex = children.length - 1;

            var oldStartIndex = 0, startIndex = 0,
                successful = true,
                nextChild;
            outer: while (successful && oldStartIndex <= oldEndIndex && startIndex <= endIndex) {
                successful = false;
                var oldStartChild, oldEndChild, startChild, endChild;

                oldStartChild = oldChildren[oldStartIndex];
                startChild = normIndex(children, startIndex, oldStartChild);
                while (oldStartChild.key === startChild.key) {
                    updateNode(oldStartChild, startChild, domElement, ns, oldChildren, oldStartIndex + 1, outerNextChild);
                    oldStartIndex++; startIndex++;
                    if (oldStartIndex > oldEndIndex || startIndex > endIndex) {
                        break outer;
                    }
                    oldStartChild = oldChildren[oldStartIndex];
                    startChild = normIndex(children, startIndex, oldStartChild);
                    successful = true;
                }
                oldEndChild = oldChildren[oldEndIndex];
                endChild = normIndex(children, endIndex);
                while (oldEndChild.key === endChild.key) {
                    updateNode(oldEndChild, endChild, domElement, ns, children, endIndex + 1, outerNextChild);
                    oldEndIndex--; endIndex--;
                    if (oldStartIndex > oldEndIndex || startIndex > endIndex) {
                        break outer;
                    }
                    oldEndChild = oldChildren[oldEndIndex];
                    endChild = normIndex(children, endIndex);
                    successful = true;
                }
                while (oldStartChild.key === endChild.key) {
                    nextChild = (endIndex + 1 < childrenLength) ? children[endIndex + 1] : outerNextChild;
                    updateNode(oldStartChild, endChild, domElement, ns, null, 0, nextChild);
                    moveChild(domElement, endChild, nextChild);
                    oldStartIndex++; endIndex--;
                    if (oldStartIndex > oldEndIndex || startIndex > endIndex) {
                        break outer;
                    }
                    oldStartChild = oldChildren[oldStartIndex];
                    endChild = normIndex(children, endIndex);
                    successful = true;
                }
                while (oldEndChild.key === startChild.key) {
                    nextChild = (oldStartIndex < oldChildrenLength) ? oldChildren[oldStartIndex] : outerNextChild;
                    updateNode(oldEndChild, startChild, domElement, ns, null, 0, nextChild);
                    moveChild(domElement, startChild, nextChild);
                    oldEndIndex--; startIndex++;
                    if (oldStartIndex > oldEndIndex || startIndex > endIndex) {
                        break outer;
                    }
                    oldEndChild = oldChildren[oldEndIndex];
                    startChild = normIndex(children, startIndex);
                    successful = true;
                }
            }

            if (oldStartIndex > oldEndIndex) {
                nextChild = (endIndex + 1 < childrenLength) ? normIndex(children, endIndex + 1) : outerNextChild;
                // TODO create single html string in IE for better performance
                for (i = startIndex; i <= endIndex; i++) {
                    createNode(normIndex(children, i), domElement, ns, nextChild);
                }
            } else if (startIndex > endIndex) {
                removeChildren(domElement, oldChildren, oldStartIndex, oldEndIndex + 1);
            } else {
                var i, oldNextChild = oldChildren[oldEndIndex + 1],
                    oldChildrenMap = {};
                for (i = oldEndIndex; i >= oldStartIndex; i--) {
                    oldChild = oldChildren[i];
                    oldChild.next = oldNextChild;
                    oldChildrenMap[oldChild.key] = oldChild;
                    oldNextChild = oldChild;
                }
                nextChild = (endIndex + 1 < childrenLength) ? normIndex(children, endIndex + 1) : outerNextChild;
                for (i = endIndex; i >= startIndex; i--) {
                    child = children[i];
                    var key = child.key;
                    oldChild = oldChildrenMap[key];
                    if (oldChild) {
                        oldChildrenMap[key] = null;
                        oldNextChild = oldChild.next;
                        updateNode(oldChild, child, domElement, ns, null, 0, nextChild);
                        // TODO find solution without checking the dom
                        if (domElement.nextSibling != (nextChild && nextChild.dom)) {
                            moveChild(domElement, child, nextChild);
                        }
                    } else {
                        createNode(child, domElement, ns, nextChild);
                    }
                    nextChild = child;
                }
                for (i = oldStartIndex; i <= oldEndIndex; i++) {
                    oldChild = oldChildren[i];
                    if (oldChildrenMap[oldChild.key] !== null) {
                        removeChild(domElement, oldChild);
                    }
                }
            }
        }

        var stopImmediate = false;

        function eventHandler(event) {
            event = getFixedEvent(event, this); // jshint ignore:line
            var currentTarget = event.currentTarget,
                eventHandlers = currentTarget.virtualNode.events[event.type];
            if (isArray(eventHandlers)) {
                for (var i = 0, len = eventHandlers.length; i < len; i++) {
                    callEventHandler(eventHandlers[i], currentTarget, event);
                    if (stopImmediate) {
                        stopImmediate = false;
                        break;
                    }
                }
            } else {
                callEventHandler(eventHandlers, currentTarget, event);
            }
        }

        // jshint ignore:start
        function preventDefault() {
            this.defaultPrevented = true;
            this.returnValue = false;
        }
        function stopPropagation() {
            this.cancelBubble = true;
        }
        function stopImmediatePropagation() {
            stopImmediate = true;
            this.stopPropagation();
        }
        // jshint ignore:end

        function getFixedEvent(event, thisArg) {
            if (!event) {
                event = window.event;
                if (!event.preventDefault) {
                    event.preventDefault = preventDefault;
                    event.stopPropagation = stopPropagation;
                    event.defaultPrevented = (event.returnValue === false);
                    event.target = event.srcElement;
                }
                event.currentTarget = thisArg.nodeType ? thisArg : event.target; // jshint ignore:line
                // TODO further event normalization
            }
            event.stopImmediatePropagation = stopImmediatePropagation;
            return event;
        }

        function callEventHandler(eventHandler, currentTarget, event) {
            try {
                if (eventHandler.call(currentTarget, event) === false) {
                    event.preventDefault();
                }
            } catch (e) {
                console$1.error(e.stack || e);
            }
        }

        function updateNode(oldNode, node, domParent, parentNs, nextChildChildren, nextChildIndex, outerNextChild, isOnlyDomChild) {
            if (node === oldNode) {
                return;
            }
            var tag = node.tag;
            if (oldNode.tag !== tag) {
                createNode(node, domParent, parentNs, oldNode, true);
            } else {
                var domNode = oldNode.dom,
                    oldChildren = oldNode.children, children = node.children;
                switch (tag) {
                    case undefined:
                        var nextChild = (nextChildChildren && nextChildIndex < nextChildChildren.length) ? nextChildChildren[nextChildIndex] : outerNextChild;
                        updateFragment(oldNode, oldChildren, node, children, domParent, parentNs, nextChild);
                        break;
                    case '#':
                    case '!':
                        if (oldChildren !== children) {
                            domNode.nodeValue = children;
                        }
                        node.dom = domNode;
                        break;
                    case '<':
                        if (oldChildren !== children) {
                            createNode(node, domParent, null, oldNode, true, isOnlyDomChild);
                        } else {
                            node.dom = oldNode.dom;
                            node.domLength = oldNode.domLength;
                        }
                        break;
                    default:
                        var attrs = node.attrs, oldAttrs = oldNode.attrs;
                        if ((attrs && attrs.is) !== (oldAttrs && oldAttrs.is)) {
                            createNode(node, domParent, parentNs, oldNode, true);
                            return;
                        }

                        var ns = oldNode.ns;
                        if (ns) node.ns = ns;
                        node.dom = domNode;
                        if (children !== oldChildren) {
                            updateChildren(domNode, node, ns, oldChildren, children, false);
                        }

                        var events = node.events, oldEvents = oldNode.events;
                        if (attrs !== oldAttrs) {
                            var changedHandlers = events && events.$changed;
                            var changes = updateAttributes(domNode, tag, ns, attrs, oldAttrs, !!changedHandlers);
                            if (changes) {
                                triggerLight(changedHandlers, '$changed', domNode, node, 'changes', changes);
                            }
                        }
                        if (events !== oldEvents) {
                            updateEvents(domNode, node, events, oldEvents);
                        }
                        break;
                }
            }
        }

        function updateFragment(oldNode, oldChildren, node, children, domParent, parentNs, nextChild) {
            children = normChildren(node, children, oldChildren);
            if (children === oldChildren) {
                return;
            }
            var childrenType = getChildrenType(children),
                oldChildrenType = getChildrenType(oldChildren),
                domNode, domLength;
            if (parentNs) {
                node.ns = parentNs;
            }
            if (childrenType === 0) {
                if (oldChildrenType === 0) {
                    domNode = oldNode.dom;
                } else {
                    removeAllChildren(domParent, oldChildren, oldChildrenType);
                    domNode = emptyTextNode();
                    insertChild(domParent, domNode, nextChild);
                }
            } else if (oldChildrenType === 0) {
                domParent.removeChild(oldNode.dom);
                createFragment(node, children, domParent, parentNs, nextChild);
                return;
            } else {
                updateChildren(domParent, node, parentNs, oldChildren, children, true, nextChild);
                children = node.children;
                if (isArray(children)) {
                    domNode = children[0].dom;
                    domLength = 0;
                    // TODO should be done without extra loop/lazy
                    for (var i = 0, childrenLength = children.length; i < childrenLength; i++) {
                        domLength += children[i].domLength || 1;
                    }
                } else {
                    domNode = children.dom;
                    domLength = children.domLength;
                }
            }
            node.dom = domNode;
            node.domLength = domLength;
        }

        function destroyNode(node) {
            if (!isString(node)) {
                var domNode = node.dom;
                if (domNode) {
                    var events = node.events;
                    if (events) {
                        for (var eventType in events) {
                            removeEventHandler(domNode, eventType);
                        }
                        var destroyedHandlers = events.$destroyed;
                        if (destroyedHandlers) {
                            triggerLight(destroyedHandlers, '$destroyed', domNode, node);
                        }
                    }
                    if (domNode.virtualNode) {
                        domNode.virtualNode = undefined;
                    }
                }
                var children = node.children;
                if (children) {
                    destroyNodes(children, getChildrenType(children));
                }
            }
        }

        function destroyNodes(nodes, nodesType) {
            if (nodesType > 1) {
                for (var i = 0, len = nodes.length; i < len; i++) {
                    destroyNode(nodes[i]);
                }
            } else if (nodesType !== 0) {
                destroyNode(getOnlyChild(nodes, nodesType));
            }
        }

        function copyObjectProps(source, target) {
            var key;
            for (key in source) {
                target[key] = source[key];
            }
            for (key in target) {
                if (source[key] === undefined) {
                    target[key] = undefined;
                }
            }
        }

        function maintainFocus(previousActiveElement) {
            if (previousActiveElement && previousActiveElement != document$1.body && previousActiveElement != document$1.activeElement) {
                previousActiveElement.focus();
            }
        }

        var vdom = {
            create: function (node) {
                node = norm(node);
                createNode(node);
                return node;
            },
            append: function (domParent, node) {
                node = norm(node);
                createNode(node, domParent);
                return node;
            },
            update: function (oldNode, node) {
                var activeElement = document$1.activeElement;
                node = norm(node, oldNode);
                updateNode(oldNode, node, oldNode.dom.parentNode);
                copyObjectProps(node, oldNode);
                maintainFocus(activeElement);
                return oldNode;
            },
            updateChildren: function (element, children) {
                var activeElement = document$1.activeElement;
                var oldChildren = element.children;
                if (oldChildren !== children) {
                    updateChildren(element.dom, element, element.ns, oldChildren, children, !element.tag);
                }
                maintainFocus(activeElement);
            },
            remove: function (node) {
                var domParent = node.dom.parentNode;
                removeChild(domParent, node);
            }
        };
    // 20170408 ML: removeChild fix (849)
    // 20180531 ML: export

    // ZOMBULAR ed. 15, 2018-06-25, ML

    function each(list, func, between) {
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
        
    function val(f, ...args) {
        return (typeof f === 'function') ? f(...args) : f;
    }

    function throttled(delay, fn) {
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

    function callQueue(q) {
        while (q.length > 0) {
            try {
                q.shift()();
            } catch(err) {
                console.error(err);
            }
        }
    }

    // ZOMBULAR ed. 15, 2018-06-25, ML

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
        var performUpdate = throttled(0, function() {
            updating = true;
            if (vnode) vdom.update(vnode, old => func(ctx, old));
            else vnode = vdom.append(dom, old => func(ctx, old));
            callQueue(queue);
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
    }
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
                    if (val(v[k])) result.push(k);                    
                }
                return result;
            }
        } 
        else return [String(v)];
    }

    function parseSpec(spec, ctx, old) {
        spec = val(spec, ctx, old);
        if (typeof spec === 'string') {
            if (spec === '<' || spec === '!') { return {tag: spec}; } 
            else if (spec === '') { return {}; } 
            else { spec = {is: spec}; }
        }
        // spec -> tag, id, classes
        if (typeof spec !== 'object') return {};
        spec.is = val(spec.is, ctx, old);
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
                var nval = val(spec[key], ctx, old);
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

    var z$1 = Object.assign(z, {Node, Val, Ref, each: each});

    // ZOMBULAR ed. 15, 2018-06-25, ML

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
                if (prop in z$1) return z$1[prop];
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
                return z$1(...args);
            },
        });
    }

    let body = z$1.Node(document.body, z$1(''));
    window.addEventListener('hashchange', () => { 
        updateRoute(); 
        body.update(); 
    });

    var z$2 = Object.assign(withPrefix(), { 
      setBody: f => {
          body.set(f); 
          body.update(true);
      },
      update: body.update,
      route,
      _: (...args) => z$1('', ...args),
    });

    /**
     * Defaults & options
     * @returns {object} Typed defaults & options
     * @public
     */

    const defaults = {
      /**
       * @property {array} strings strings to be typed
       * @property {string} stringsElement ID of element containing string children
       */
      strings: ['These are the default values...', 'You know what you should do?', 'Use your own!', 'Have a great day!'],
      stringsElement: null,

      /**
       * @property {number} typeSpeed type speed in milliseconds
       */
      typeSpeed: 0,

      /**
       * @property {number} startDelay time before typing starts in milliseconds
       */
      startDelay: 0,

      /**
       * @property {number} backSpeed backspacing speed in milliseconds
       */
      backSpeed: 0,

      /**
       * @property {boolean} smartBackspace only backspace what doesn't match the previous string
       */
      smartBackspace: true,

      /**
       * @property {boolean} shuffle shuffle the strings
       */
      shuffle: false,

      /**
       * @property {number} backDelay time before backspacing in milliseconds
       */
      backDelay: 700,

      /**
       * @property {boolean} fadeOut Fade out instead of backspace
       * @property {string} fadeOutClass css class for fade animation
       * @property {boolean} fadeOutDelay Fade out delay in milliseconds
       */
      fadeOut: false,
      fadeOutClass: 'typed-fade-out',
      fadeOutDelay: 500,

      /**
       * @property {boolean} loop loop strings
       * @property {number} loopCount amount of loops
       */
      loop: false,
      loopCount: Infinity,

      /**
       * @property {boolean} showCursor show cursor
       * @property {string} cursorChar character for cursor
       * @property {boolean} autoInsertCss insert CSS for cursor and fadeOut into HTML <head>
       */
      showCursor: true,
      cursorChar: '|',
      autoInsertCss: true,

      /**
       * @property {string} attr attribute for typing
       * Ex: input placeholder, value, or just HTML text
       */
      attr: null,

      /**
       * @property {boolean} bindInputFocusEvents bind to focus and blur if el is text input
       */
      bindInputFocusEvents: false,

      /**
       * @property {string} contentType 'html' or 'null' for plaintext
       */
      contentType: 'html',

      /**
       * All typing is complete
       * @param {Typed} self
       */
      onComplete: (self) => {},

      /**
       * Before each string is typed
       * @param {number} arrayPos
       * @param {Typed} self
       */
      preStringTyped: (arrayPos, self) => {},

      /**
       * After each string is typed
       * @param {number} arrayPos
       * @param {Typed} self
       */
      onStringTyped: (arrayPos, self) => {},

      /**
       * During looping, after last string is typed
       * @param {Typed} self
       */
      onLastStringBackspaced: (self) => {},

      /**
       * Typing has been stopped
       * @param {number} arrayPos
       * @param {Typed} self
       */
      onTypingPaused: (arrayPos, self) => {},

      /**
       * Typing has been started after being stopped
       * @param {number} arrayPos
       * @param {Typed} self
       */
      onTypingResumed: (arrayPos, self) => {},

      /**
       * After reset
       * @param {Typed} self
       */
      onReset: (self) => {},

      /**
       * After stop
       * @param {number} arrayPos
       * @param {Typed} self
       */
      onStop: (arrayPos, self) => {},

      /**
       * After start
       * @param {number} arrayPos
       * @param {Typed} self
       */
      onStart: (arrayPos, self) => {},

      /**
       * After destroy
       * @param {Typed} self
       */
      onDestroy: (self) => {}
    };

    /**
     * Initialize the Typed object
     */

    class Initializer {
      /**
       * Load up defaults & options on the Typed instance
       * @param {Typed} self instance of Typed
       * @param {object} options options object
       * @param {string} elementId HTML element ID _OR_ instance of HTML element
       * @private
       */

      load(self, options, elementId) {
        // chosen element to manipulate text
        if (typeof elementId === 'string') {
          self.el = document.querySelector(elementId);
        } else {
          self.el = elementId;
        }

        self.options = {...defaults, ...options};

        // attribute to type into
        self.isInput = self.el.tagName.toLowerCase() === 'input';
        self.attr = self.options.attr;
        self.bindInputFocusEvents = self.options.bindInputFocusEvents;

        // show cursor
        self.showCursor = self.isInput ? false : self.options.showCursor;

        // custom cursor
        self.cursorChar = self.options.cursorChar;

        // Is the cursor blinking
        self.cursorBlinking = true;

        // text content of element
        self.elContent = self.attr ? self.el.getAttribute(self.attr) : self.el.textContent;

        // html or plain text
        self.contentType = self.options.contentType;

        // typing speed
        self.typeSpeed = self.options.typeSpeed;

        // add a delay before typing starts
        self.startDelay = self.options.startDelay;

        // backspacing speed
        self.backSpeed = self.options.backSpeed;

        // only backspace what doesn't match the previous string
        self.smartBackspace = self.options.smartBackspace;

        // amount of time to wait before backspacing
        self.backDelay = self.options.backDelay;

        // Fade out instead of backspace
        self.fadeOut = self.options.fadeOut;
        self.fadeOutClass = self.options.fadeOutClass;
        self.fadeOutDelay = self.options.fadeOutDelay;

        // variable to check whether typing is currently paused
        self.isPaused = false;

        // input strings of text
        self.strings = self.options.strings.map((s) => s.trim());

        // div containing strings
        if (typeof self.options.stringsElement === 'string') {
          self.stringsElement = document.querySelector(self.options.stringsElement);
        } else {
          self.stringsElement = self.options.stringsElement;
        }

        if (self.stringsElement) {
          self.strings = [];
          self.stringsElement.style.display = 'none';
          const strings = Array.prototype.slice.apply(self.stringsElement.children);
          const stringsLength = strings.length;

          if (stringsLength) {
            for (let i = 0; i < stringsLength; i += 1) {
              const stringEl = strings[i];
              self.strings.push(stringEl.innerHTML.trim());
            }
          }
        }

        // character number position of current string
        self.strPos = 0;

        // current array position
        self.arrayPos = 0;

        // index of string to stop backspacing on
        self.stopNum = 0;

        // Looping logic
        self.loop = self.options.loop;
        self.loopCount = self.options.loopCount;
        self.curLoop = 0;

        // shuffle the strings
        self.shuffle = self.options.shuffle;
        // the order of strings
        self.sequence = [];

        self.pause = {
          status: false,
          typewrite: true,
          curString: '',
          curStrPos: 0
        };

        // When the typing is complete (when not looped)
        self.typingComplete = false;

        // Set the order in which the strings are typed
        for (let i in self.strings) {
          self.sequence[i] = i;
        }

        // If there is some text in the element
        self.currentElContent = this.getCurrentElContent(self);

        self.autoInsertCss = self.options.autoInsertCss;

        this.appendAnimationCss(self);
      }

      getCurrentElContent(self) {
        let elContent = '';
        if (self.attr) {
          elContent = self.el.getAttribute(self.attr);
        } else if (self.isInput) {
          elContent = self.el.value;
        } else if (self.contentType === 'html') {
          elContent = self.el.innerHTML;
        } else {
          elContent = self.el.textContent;
        }
        return elContent;
      }

      appendAnimationCss(self) {
        const cssDataName = 'data-typed-js-css';
        if (!self.autoInsertCss) { return; }
        if (!self.showCursor && !self.fadeOut) { return; }
        if (document.querySelector(`[${cssDataName}]`)) { return; }

        let css = document.createElement('style');
        css.type = 'text/css';
        css.setAttribute(cssDataName, true);

        let innerCss = '';
        if (self.showCursor) {
          innerCss += `
        .typed-cursor{
          opacity: 1;
        }
        .typed-cursor.typed-cursor--blink{
          animation: typedjsBlink 0.7s infinite;
          -webkit-animation: typedjsBlink 0.7s infinite;
                  animation: typedjsBlink 0.7s infinite;
        }
        @keyframes typedjsBlink{
          50% { opacity: 0.0; }
        }
        @-webkit-keyframes typedjsBlink{
          0% { opacity: 1; }
          50% { opacity: 0.0; }
          100% { opacity: 1; }
        }
      `;
        }
        if (self.fadeOut) {
          innerCss += `
        .typed-fade-out{
          opacity: 0;
          transition: opacity .25s;
        }
        .typed-cursor.typed-cursor--blink.typed-fade-out{
          -webkit-animation: 0;
          animation: 0;
        }
      `;
        }
        if (css.length === 0) { return; }
        css.innerHTML = innerCss;
        document.body.appendChild(css);
      }
    }

    let initializer = new Initializer();

    /**
     * TODO: These methods can probably be combined somehow
     * Parse HTML tags & HTML Characters
     */

    class HTMLParser {
      /**
       * Type HTML tags & HTML Characters
       * @param {string} curString Current string
       * @param {number} curStrPos Position in current string
       * @param {Typed} self instance of Typed
       * @returns {number} a new string position
       * @private
       */

      typeHtmlChars(curString, curStrPos, self) {
        if (self.contentType !== 'html') return curStrPos;
        const curChar = curString.substr(curStrPos).charAt(0);
        if (curChar === '<' || curChar === '&') {
          let endTag = '';
          if (curChar === '<') {
            endTag = '>';
          } else {
            endTag = ';';
          }
          while (curString.substr(curStrPos + 1).charAt(0) !== endTag) {
            curStrPos++;
            if (curStrPos + 1 > curString.length) {
              break;
            }
          }
          curStrPos++;
        }
        return curStrPos;
      }

      /**
       * Backspace HTML tags and HTML Characters
       * @param {string} curString Current string
       * @param {number} curStrPos Position in current string
       * @param {Typed} self instance of Typed
       * @returns {number} a new string position
       * @private
       */
      backSpaceHtmlChars(curString, curStrPos, self) {
        if (self.contentType !== 'html') return curStrPos;
        const curChar = curString.substr(curStrPos).charAt(0);
        if (curChar === '>' || curChar === ';') {
          let endTag = '';
          if (curChar === '>') {
            endTag = '<';
          } else {
            endTag = '&';
          }
          while (curString.substr(curStrPos - 1).charAt(0) !== endTag) {
            curStrPos--;
            if (curStrPos < 0) {
              break;
            }
          }
          curStrPos--;
        }
        return curStrPos;
      }
    }

    let htmlParser = new HTMLParser();

    /**
     * Welcome to Typed.js!
     * @param {string} elementId HTML element ID _OR_ HTML element
     * @param {object} options options object
     * @returns {object} a new Typed object
     */
    class Typed {
      constructor(elementId, options) {
        // Initialize it up
        initializer.load(this, options, elementId);
        // All systems go!
        this.begin();
      }

      /**
       * Toggle start() and stop() of the Typed instance
       * @public
       */
      toggle() {
        this.pause.status ? this.start() : this.stop();
      }

      /**
       * Stop typing / backspacing and enable cursor blinking
       * @public
       */
      stop() {
        if (this.typingComplete) return;
        if (this.pause.status) return;
        this.toggleBlinking(true);
        this.pause.status = true;
        this.options.onStop(this.arrayPos, this);
      }

      /**
       * Start typing / backspacing after being stopped
       * @public
       */
      start() {
        if (this.typingComplete) return;
        if (!this.pause.status) return;
        this.pause.status = false;
        if (this.pause.typewrite) {
          this.typewrite(this.pause.curString, this.pause.curStrPos);
        } else {
          this.backspace(this.pause.curString, this.pause.curStrPos);
        }
        this.options.onStart(this.arrayPos, this);
      }

      /**
       * Destroy this instance of Typed
       * @public
       */
      destroy() {
        this.reset(false);
        this.options.onDestroy(this);
      }

      /**
       * Reset Typed and optionally restarts
       * @param {boolean} restart
       * @public
       */
      reset(restart = true) {
        clearInterval(this.timeout);
        this.replaceText('');
        if (this.cursor && this.cursor.parentNode) {
          this.cursor.parentNode.removeChild(this.cursor);
          this.cursor = null;
        }
        this.strPos = 0;
        this.arrayPos = 0;
        this.curLoop = 0;
        if (restart) {
          this.insertCursor();
          this.options.onReset(this);
          this.begin();
        }
      }

      /**
       * Begins the typing animation
       * @private
       */
      begin() {
        this.typingComplete = false;
        this.shuffleStringsIfNeeded(this);
        this.insertCursor();
        if (this.bindInputFocusEvents) this.bindFocusEvents();
        this.timeout = setTimeout(() => {
          // Check if there is some text in the element, if yes start by backspacing the default message
          if (!this.currentElContent || this.currentElContent.length === 0) {
            this.typewrite(this.strings[this.sequence[this.arrayPos]], this.strPos);
          } else {
            // Start typing
            this.backspace(this.currentElContent, this.currentElContent.length);
          }
        }, this.startDelay);
      }

      /**
       * Called for each character typed
       * @param {string} curString the current string in the strings array
       * @param {number} curStrPos the current position in the curString
       * @private
       */
      typewrite(curString, curStrPos) {
        if (this.fadeOut && this.el.classList.contains(this.fadeOutClass)) {
          this.el.classList.remove(this.fadeOutClass);
          if (this.cursor) this.cursor.classList.remove(this.fadeOutClass);
        }

        const humanize = this.humanizer(this.typeSpeed);
        let numChars = 1;

        if (this.pause.status === true) {
          this.setPauseStatus(curString, curStrPos, true);
          return;
        }

        // contain typing function in a timeout humanize'd delay
        this.timeout = setTimeout(() => {
          // skip over any HTML chars
          curStrPos = htmlParser.typeHtmlChars(curString, curStrPos, this);

          let pauseTime = 0;
          let substr = curString.substr(curStrPos);
          // check for an escape character before a pause value
          // format: \^\d+ .. eg: ^1000 .. should be able to print the ^ too using ^^
          // single ^ are removed from string
          if (substr.charAt(0) === '^') {
            if (/^\^\d+/.test(substr)) {
              let skip = 1; // skip at least 1
              substr = /\d+/.exec(substr)[0];
              skip += substr.length;
              pauseTime = parseInt(substr);
              this.temporaryPause = true;
              this.options.onTypingPaused(this.arrayPos, this);
              // strip out the escape character and pause value so they're not printed
              curString = curString.substring(0, curStrPos) + curString.substring(curStrPos + skip);
              this.toggleBlinking(true);
            }
          }

          // check for skip characters formatted as
          // "this is a `string to print NOW` ..."
          if (substr.charAt(0) === '`') {
            while (curString.substr(curStrPos + numChars).charAt(0) !== '`') {
              numChars++;
              if (curStrPos + numChars > curString.length) break;
            }
            // strip out the escape characters and append all the string in between
            const stringBeforeSkip = curString.substring(0, curStrPos);
            const stringSkipped = curString.substring(stringBeforeSkip.length + 1, curStrPos + numChars);
            const stringAfterSkip = curString.substring(curStrPos + numChars + 1);
            curString = stringBeforeSkip + stringSkipped + stringAfterSkip;
            numChars--;
          }

          // timeout for any pause after a character
          this.timeout = setTimeout(() => {
            // Accounts for blinking while paused
            this.toggleBlinking(false);

            // We're done with this sentence!
            if (curStrPos === curString.length) {
              this.doneTyping(curString, curStrPos);
            } else {
              this.keepTyping(curString, curStrPos, numChars);
            }
            // end of character pause
            if (this.temporaryPause) {
              this.temporaryPause = false;
              this.options.onTypingResumed(this.arrayPos, this);
            }
          }, pauseTime);

          // humanized value for typing
        }, humanize);
      }

      /**
       * Continue to the next string & begin typing
       * @param {string} curString the current string in the strings array
       * @param {number} curStrPos the current position in the curString
       * @private
       */
      keepTyping(curString, curStrPos, numChars) {
        // call before functions if applicable
        if (curStrPos === 0) {
          this.toggleBlinking(false);
          this.options.preStringTyped(this.arrayPos, this);
        }
        // start typing each new char into existing string
        // curString: arg, this.el.html: original text inside element
        curStrPos += numChars;
        const nextString = curString.substr(0, curStrPos);
        this.replaceText(nextString);
        // loop the function
        this.typewrite(curString, curStrPos);
      }

      /**
       * We're done typing all strings
       * @param {string} curString the current string in the strings array
       * @param {number} curStrPos the current position in the curString
       * @private
       */
      doneTyping(curString, curStrPos) {
        // fires callback function
        this.options.onStringTyped(this.arrayPos, this);
        this.toggleBlinking(true);
        // is this the final string
        if (this.arrayPos === this.strings.length - 1) {
          // callback that occurs on the last typed string
          this.complete();
          // quit if we wont loop back
          if (this.loop === false || this.curLoop === this.loopCount) {
            return;
          }
        }
        this.timeout = setTimeout(() => {
          this.backspace(curString, curStrPos);
        }, this.backDelay);
      }

      /**
       * Backspaces 1 character at a time
       * @param {string} curString the current string in the strings array
       * @param {number} curStrPos the current position in the curString
       * @private
       */
      backspace(curString, curStrPos) {
        if (this.pause.status === true) {
          this.setPauseStatus(curString, curStrPos, true);
          return;
        }
        if (this.fadeOut) return this.initFadeOut();

        this.toggleBlinking(false);
        const humanize = this.humanizer(this.backSpeed);

        this.timeout = setTimeout(() => {
          curStrPos = htmlParser.backSpaceHtmlChars(curString, curStrPos, this);
          // replace text with base text + typed characters
          const curStringAtPosition = curString.substr(0, curStrPos);
          this.replaceText(curStringAtPosition);

          // if smartBack is enabled
          if (this.smartBackspace) {
            // the remaining part of the current string is equal of the same part of the new string
            let nextString = this.strings[this.arrayPos + 1];
            if (nextString && curStringAtPosition === nextString.substr(0, curStrPos)) {
              this.stopNum = curStrPos;
            } else {
              this.stopNum = 0;
            }
          }

          // if the number (id of character in current string) is
          // less than the stop number, keep going
          if (curStrPos > this.stopNum) {
            // subtract characters one by one
            curStrPos--;
            // loop the function
            this.backspace(curString, curStrPos);
          } else if (curStrPos <= this.stopNum) {
            // if the stop number has been reached, increase
            // array position to next string
            this.arrayPos++;
            // When looping, begin at the beginning after backspace complete
            if (this.arrayPos === this.strings.length) {
              this.arrayPos = 0;
              this.options.onLastStringBackspaced();
              this.shuffleStringsIfNeeded();
              this.begin();
            } else {
              this.typewrite(this.strings[this.sequence[this.arrayPos]], curStrPos);
            }
          }
          // humanized value for typing
        }, humanize);
      }

      /**
       * Full animation is complete
       * @private
       */
      complete() {
        this.options.onComplete(this);
        if (this.loop) {
          this.curLoop++;
        } else {
          this.typingComplete = true;
        }
      }

      /**
       * Has the typing been stopped
       * @param {string} curString the current string in the strings array
       * @param {number} curStrPos the current position in the curString
       * @param {boolean} isTyping
       * @private
       */
      setPauseStatus(curString, curStrPos, isTyping) {
        this.pause.typewrite = isTyping;
        this.pause.curString = curString;
        this.pause.curStrPos = curStrPos;
      }

      /**
       * Toggle the blinking cursor
       * @param {boolean} isBlinking
       * @private
       */
      toggleBlinking(isBlinking) {
        if (!this.cursor) return;
        // if in paused state, don't toggle blinking a 2nd time
        if (this.pause.status) return;
        if (this.cursorBlinking === isBlinking) return;
        this.cursorBlinking = isBlinking;
        if (isBlinking) {
          this.cursor.classList.add('typed-cursor--blink');
        } else {
          this.cursor.classList.remove('typed-cursor--blink');
        }
      }

      /**
       * Speed in MS to type
       * @param {number} speed
       * @private
       */
      humanizer(speed) {
        return Math.round(Math.random() * speed / 2) + speed;
      }

      /**
       * Shuffle the sequence of the strings array
       * @private
       */
      shuffleStringsIfNeeded() {
        if (!this.shuffle) return;
        this.sequence = this.sequence.sort(() => Math.random() - 0.5);
      }

      /**
       * Adds a CSS class to fade out current string
       * @private
       */
      initFadeOut() {
        this.el.className += ` ${this.fadeOutClass}`;
        if (this.cursor) this.cursor.className += ` ${this.fadeOutClass}`;
        return setTimeout(() => {
          this.arrayPos++;
          this.replaceText('');

          // Resets current string if end of loop reached
          if (this.strings.length > this.arrayPos) {
            this.typewrite(this.strings[this.sequence[this.arrayPos]], 0);
          } else {
            this.typewrite(this.strings[0], 0);
            this.arrayPos = 0;
          }
        }, this.fadeOutDelay);
      }

      /**
       * Replaces current text in the HTML element
       * depending on element type
       * @param {string} str
       * @private
       */
      replaceText(str) {
        if (this.attr) {
          this.el.setAttribute(this.attr, str);
        } else {
          if (this.isInput) {
            this.el.value = str;
          } else if (this.contentType === 'html') {
            this.el.innerHTML = str;
          } else {
            this.el.textContent = str;
          }
        }
      }

      /**
       * If using input elements, bind focus in order to
       * start and stop the animation
       * @private
       */
      bindFocusEvents() {
        if (!this.isInput) return;
        this.el.addEventListener('focus', (e) => {
          this.stop();
        });
        this.el.addEventListener('blur', (e) => {
          if (this.el.value && this.el.value.length !== 0) { return; }
          this.start();
        });
      }

      /**
       * On init, insert the cursor element
       * @private
       */
      insertCursor() {
        if (!this.showCursor) return;
        if (this.cursor) return;
        this.cursor = document.createElement('span');
        this.cursor.className = 'typed-cursor';
        this.cursor.innerHTML = this.cursorChar;
        this.el.parentNode && this.el.parentNode.insertBefore(this.cursor, this.el.nextSibling);
      }
    }

    let timer, start, factor;

    var smoothScroll = (target, duration=1000, layout=window) => {
        if (typeof layout === 'string') layout = document.getElementById(layout);
      	target = document.getElementById(target).offsetTop;

        let offset;
        if ('window' in layout) offset = layout.pageYOffset;
        else offset = layout.scrollTop;

        let delta  = target - offset;
        start = Date.now();
        factor = 0;

        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            let y;
            factor = (Date.now() - start) / duration;
            if (factor >= 1) {
                clearInterval(timer);
                factor = 1;
            }
            y = factor * delta + offset;
            if ('window' in layout) layout.scrollBy(0, y - layout.pageYOffset);
            else layout.scrollTop += y - layout.scrollTop;
        }, 10);
    };

    document.title = 'Blackmius';

    const breakpoints = {
    	xlarge: '(max-width: 1800px)',
    	large: '(max-width: 1280px)',
    	medium: '(max-width: 980px)',
    	notSmall: '(min-width: 769px)',
    	small: '(max-width: 769px)',
    	xsmall: '(max-width: 480px)'
    };

    const breakpoint = (a, b) => `@media screen and ${breakpoints[a]} {${b}}`;

    const Style = z$2._style(`
@import url('https://fonts.googleapis.com/css?family=PT+Sans|PT+Serif:400,700');
@import url("/assets/icomoon/style.css");
@import url("/lib/normalize.css");

* { box-sizing: border-box; }
html { font: 400 10px/15px 'PT Sans', sans-serif; }

.l1 { font-size: 10px; line-height: 15px; top:  3px; position: relative; }
.l2 { font-size: 12px; line-height: 15px; top:  2px; position: relative; }
.l3 { font-size: 20px; line-height: 30px; top:  8px; position: relative; }
.l4 { font-size: 24px; line-height: 30px; top:  7px; position: relative; }
.l5 { font-size: 30px; line-height: 45px; top: 12px; position: relative; }
.l6 { font-size: 40px; line-height: 45px; top:  9px; position: relative; }
.l7 { font-size: 50px; line-height: 60px; top: 15px; position: relative; }
.l8 { font-size: 58px; line-height: 60px; top: 10px; position: relative; }
.l9 { font-size: 74px; line-height: 75px; top: 18px; position: relative; }

.f1 { font-family: 'PT Serif', sans-serif; } .w7 { font-weight: 700; }
.c0 { color: #000; }
.b0 { background-color: #fefefe; } .b1 { background-color: #f5f5f5; }
.fvh { height: 100vh; }

.g { display: flex; }
.g.c { flex-direction: column; }
.g.jcc { justify-content: center; }

.di { display: inline-block; }

.p0 { padding: 0 45px; }
.p1 { padding: 0 90px; }

.sp1 { margin-top: 15px; }
.sp2 { margin-top: 30px; }
.sp3 { margin-top: 45px; }
.sp4 { margin-top: 60px; }
.sp5 { margin-top: 75px; }
.sp6 { margin-top: 90px; }

.pr { position: relative; }
.pa { position: absolute; }
.pb0 { bottom: 30px; }
.pc { left: 0; right: 0; }

.tc { text-align: center; }
.cp { cursor: pointer; }

.floating { animation-name: floating; animation-duration: 3s;
    animation-iteration-count: infinite; animation-timing-function: ease-in-out;
}

@keyframes floating {
    from { transform: translate(0,  0px); }
    65%  { transform: translate(0, 15px); }
    to   { transform: translate(0, -0px); }
}

a { color: inherit; text-decoration: none; display: inline-block; }
a::after { content: ''; display: block; width: 0; height: 2px; background: #000;transition: width .3s; }
a:hover::after { width: 100%; }

.column { display: block; flex-basis: 0; flex-grow: 1;
	flex-shrink: 1; padding: 0.75rem; }
.columns { margin: -0.75rem -0.75rem 0.75rem -0.75rem; }
.preview { width: 100%; border-radius: 2px; }

${breakpoint('medium', `
	.p1 { padding: 0 45px; }
    .l9 { font-size: 50px; line-height: 60px; top: 15px; position: relative; }
`)}

${breakpoint('notSmall', `
	.columns { display: flex; }
`)}

`);

    const Icon = name => z$2(`i.icon-${name}`);

    const AboutMe = `I'm a full-stack web developer with 5 years of professional experience.
The scope of my work is a large part of the front end: HTML/CSS/JS,
building Single Page Apps with Zombular, designing web application using modern
approaches. Also I get my hands dirty with some back end applications written in Python and NodeJS.`;

    const ContactMe = `I am available for remote opprotunity, collaborations and interesting projects.
If you would like to build something together, contact me.`;

    const Contacts = [
        ['8 (918) 201 19 31', 'tel:89182011931'],
        ['blackmius@gmail.com', 'mailto:blackmius@gmail.com'],
        ['t.me/blackmius', 'https://t.me/blackmius'],
        ['bitbucket.org/blakmius', 'https://bitbucket.org/blakmius'],
        ['github.com/blackmius', 'https://github.com/blackmius']
    ];

    const Project = ({name, description, image, links}) => z$2('.sp2.column',
    	z$2('<', `<img class="preview" src="${image}">`),
    	z$2.f1.w7.l5(name),
    	z$2.l3(description),
        z$2.sp1.l3(z$2.each(links, ([text, href]) => z$2._a({href}, text), z$2.sp05()))
    );

    let projects = [], columns = 2;
    fetch('/assets/projects/data.json')
        .then(res => res.json())
        .then(data => {
            while (data.length > 0) projects.push(z$2.columns.sp1(
            	data.splice(0, columns).map(Project)
            ));
            z$2.update();
        });

    const Body = z$2.c0(Style,
        z$2.pr.fvh.g.c.jcc.p0.b0(
            z$2.l9.w7.f1(z$2({is: 'span#TypedSentence'})),
            z$2.pa.pb0.pc(z$2.tc.l6(z$2.cp.di.floating({onclick: e => smoothScroll('AboutMe', 500)}, Icon('chevron-down'))))
        ),
        z$2.p1.b1.di({is: '#AboutMe'},
            z$2.l6.w7.f1.sp6('About me'),
            z$2.l3.sp2(AboutMe),
            z$2.l6.w7.f1.sp4('Get in touch'),
            z$2.l3.sp2(ContactMe),
            z$2.sp4.l4.w7(
                z$2.each(Contacts, ([text, href]) => z$2._a({href}, text), z$2._br())
            ),
            z$2.sp6(),
        ),
        z$2.p1.b0(
            z$2.sp6.di(),
            z$2.l7.w7.f1.tc('My recent projects'),
            _ => z$2.sp4(projects),
            z$2.sp6.di(),
        )
    );
    z$2.setBody(Body);

    const typed = new Typed('#TypedSentence', {
      strings: ['Hello, I am Daniil, a FullStack web developer'],
      showCursor: true,
      cursorChar: '_',
      typeSpeed: 45
    });

}());
//# sourceMappingURL=app.js.map
