{
  let _initialRender = true;

  //== Util ===================================================

  const _getOrCreate = (obj, propName, initFn) => {
    let target = obj[propName];
    if (!target) {
      target = initFn();
      obj[propName] = target;
    }
    return target;
  }

  const _countingArray = size => {
    return [...Array(size)];
  };

  const _repeat = (numberOfEntries, valueFn) => {
    return _countingArray(numberOfEntries).map(_ => valueFn());
  };

  const _prop = (key, value) => {
    return {
      key,
      value,
      type: "property"
    };
  };

  //== Events =================================================

  let _cleanUpFns = [];

  const _handle = fn => {
    return (...args) => {
      const result = _call(fn, ...args);
      if (result?.type === "promise") {
        _thenPromise(result, () => {
          _render();
        });
      } else {
        _render();
      }
    }
  };

  const _addAction = (listObj, action) => {
    if (!listObj.actions) {
      listObj.actions = [];
      _cleanUpFns.push(() => {
        listObj.actions = null;
      });
    }
    listObj.actions.push(action);
  };

  const _setPending = stateObj => {
    stateObj.pending = true;
    _cleanUpFns.push(() => {
      stateObj.pending = false;
    });
    if (stateObj.parent) {
      _setPending(stateObj.parent);
    }
  };

  //== Functions ==============================================

  const _fn = (fn, paramNames = [], includeArgs = false) => {
    return {
      type: "function",
      fn: (...args) => {
        const resolvedArgs = _resolveArgs(args, paramNames, includeArgs);
        fn(resolvedArgs);
      }
    };
  };

  const _resolveArgs = (args, paramNames, includeArgs) => {
    let mode = null;
    function ensureMode(newMode) {
      if (mode && newMode !== mode) {
        throw new Error("Both a key/value pair and an unnamed value were passed to a non-mixed function");
      }
      mode = newMode;
    }
    const resolvedArgs = [];
    const argList = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg?.type === "prop") {
        if (includeArgs) {
          argList.push(arg);
        } else {
          ensureMode("prop");
        }
        const position = paramNames.indexOf(arg.key);
        resolvedArgs[position] = arg.value;
      } else {
        if (includeArgs) {
          argList.push(_prop(null, arg));
        } else {
          ensureMode("unnamed");
        }
        resolvedArgs.push(arg);
      }
    }
    if (includeArgs) resolvedArgs.unshift(argList);
    return resolvedArgs;
  };

  const _call = (fn, ...args) => {
    if (fn?.type === "function") {
      return fn.fn(...args);
    } else {
      // calling fn outside of bullscript
      // TODO what should we to to exported/imported objs?
      throw new Error("what should we to to exported/imported objs?");
    }
  }

  //== Components =============================================

  const _topLevelComponents = {};
  const _nonComponentFiles = {};

  const _component = (blockFn, paramNames, deps = [], includeArgs = false) => {
    return (locId, state, forceRender, ...args) => {
      const componentStateKey = "component_" + locId;
      const values = args.map(arg => {
        const isProp = arg?.type === "property";
        return isProp ? arg.value : arg;
      });
      let componentState;
      if (_initialRender) {
        componentState = _obj({});
        state[componentStateKey] = componentState;
      } else {
        componentState = state[componentStateKey];
      }
      if (forceRender) {
        shouldRun = true;
      } else {
        let shouldRun = _initialRender;
        if (!shouldRun) {
          for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg?.pending) {
              shouldRun = true;
              break;
            } else {
              const value = values[i];
              const prevValue = componentState.prevValues[i];
              if (value !== prevValue) {
                shouldRun = true;
                break;
              }
            }
          }
          if (!shouldRun) {
            // check file dependencies
            shouldRun = deps.some(x => _nonComponentFiles[x]?.pending);
          }
        }
      }
      if (shouldRun) {
        console.log("component " + locId + " rendering...");
        componentState.prevValues = values;
        const resolvedArgs = _resolveArgs(args, paramNames, includeArgs);
        _withParentLocId(locId, () => {
          blockFn(componentState, ...resolvedArgs);
        });
      } else {
        console.log("component " + locId + " skipped");
        const fullLocId = _getFullLocId(_parentLocId, locId);
        _skipNodes.push(fullLocId);
      }
    };
  };

  //== Objects ================================================

  const _bsContainerMixins = {
    isBsContainer() {
      return true;
    },
    initContainer(jsObj) {
      for (let [key, value] of Object.entries(jsObj)) {
        if (typeof value === "object" && !_isBsContainer(value)) {
          value = Array.isArray(value) ? _list(value) : _obj(value);
          value.parent = this;
        }
        this.set(key, value);
      }
    }
  };

  const _BsObject = class _BsObject extends Map {
    constructor(obj) {
      super();
      this.initContainer(obj);
    }
  }

  Object.assign(_BsObject.prototype, _bsContainerMixins);

  const _BsList = class _BsList extends Array {
    constructor(arr) {
      super();
      this.initContainer(arr);
    }

    get(key) {
      return this[key];
    }

    set(key, value) {
      this[key] = value;
    }
  }

  Object.assign(_BsList.prototype, _bsContainerMixins);

  const _list = (...jsArr) => {
    return new _BsList(jsArr);
  };

  const _obj = jsObj => {
    return new _BsObject(jsObj);
  };

  const _isBsContainer = value => {
    return value?.isBsContainer?.();
  };

  //== List Operations ================================

  const _removeWhere = (list, predicate) => {
    const indexesToRemove = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const shouldRemove = predicate(item);
      if (shouldRemove) {
        indexesToRemove.push(i);
        _addAction(list, {actionType: "remove", value: item, index: i});
      }
    }
    indexesToRemove.forEach(_ => list.splice(_, 1));
    _setPending(list);
  };

  const _append = (collection, item, setter) => {
    const collectionType = typeof collection;
    if (collectionType === "string") {
      if (typeof item !== "string") {
        throw new Error("only string can be appended to string, not a \"" + typeof item + "\"");
      }
      setter(collection + item);
    } else if (collectionType === "number") {
      if (typeof item !== "number") {
        throw new Error("only numbers can be added to a number, not a \"" + typeof item + "\"");
      }
      setter(collection + item);
    } else if (Array.isArray(collection)) {
      collection.push(item);
    } else {
      throw new Error("cannot append to object of type \"" + typeof collection + "\"");
    }
  };

  //== State ==========================================

  const _state = _obj({});

  const _getState = (state, propName, setter, initializerFn) => {
    const initializedStateProps = _getOrCreate(state, "initializedStateProps", () => new Set());
    let value;
    if (initializedStateProps.has(propName)) {
      value = state.get(propName);
    } else {
      initializedStateProps.add(propName);
      value = initializerFn();
      value.parent = state;
      state.set(propName, value);
    }
    setter(value);
    return {
      assign: function(value) {
        setter(value);
        state.set(propName, value);
      },
    };
  };

  //== Virtual DOM ============================================

  let _parentVDom,
      _rootVDom,
      _currentVDom,
      // _parentDom,
      // _prevDom,
      _parentLocId,
      _isAfterLastSibling,
      _vDomChildToParentMap = new Map(),
      _domInitialFragment = new DocumentFragment(),
      _rootDom = document.getElementById("root"),
      _skipNodes;
  
  const _postChildrenCleanUpOption = {
    creation: () => {},
    sync: () => {
      if (!_isAfterLastSibling) {
        const lastRenderedNode = _currentVDom;
        let node = _currentVDom;
        while (node) {
          node.destroyDom();
          node = node.next;
        }
        if (lastRenderedNode) lastRenderedNode.next = null; // cut unused nodes off the end
      }
    },
  };

  let _postChildrenCleanUp = _postChildrenCleanUpOption.creation;

  class _VDomNode {
    constructor(props, el, locId) {
      this.props = props;
      this.el = el;
      this.locId = locId;
    }

    children(childFn) {
      const savedParentVDom = _parentVDom;
      const savedIsAfterLastSibling = _isAfterLastSibling;
      const savedCurrentVDom = _currentVDom;
      _isAfterLastSibling = false;
      _parentVDom = this;
      _currentVDom = this.firstChild;
      childFn();
      _postChildrenCleanUp();
      _isAfterLastSibling = savedIsAfterLastSibling;
      _parentVDom = savedParentVDom;
      _currentVDom = savedCurrentVDom;
      return this;
    }

    getLastChild() {
      if (!this.firstChild) return null;
      let child = this.firstChild;
      while (child.next) {
        child = child.next;
      }
      return child;
    }

    appendChild(child) {
      const lastChild = this.getLastChild();
      if (lastChild) {
        lastChild.next = child;
        child.prev = lastChild;
        lastChild.el.after(child.el);
      } else {
        this.firstChild = child;
        this.el.appendChild(child.el);
      }
      _vDomChildToParentMap.set(child, this);
    }

    insertBefore(sibling) {
      if (this.prev) this.prev.next = sibling;
      sibling.prev = this.prev;
      sibling.next = this;
      this.prev = sibling;
      const parent = _vDomChildToParentMap.get(this);
      _vDomChildToParentMap.set(sibling, parent);
      this.el.before(sibling.el);
    }

    applyProps(newProps) {
      for (const [key, newValue] of Object.entries(newProps)) {
        const oldValue = this.props[key];
        if (!["string", "function"].includes(typeof newValue)) throw new Error("applyProps called w/ non-supported value type \"" + (typeof newValue) + "\"");
        if (newValue !== oldValue) {
          this.props[key] = newValue;
          this.el[key] = newValue;
        }
      }
    }

    advanceVDom() {
      if (_currentVDom.next) {
        _currentVDom = _currentVDom.next;
      } else {
        _isAfterLastSibling = true;
      }
    }

    destroyDom() {
      const parent = _vDomChildToParentMap.get(this);
      if (!parent) throw new Error("Cannot destroy a node that is not attached");
      parent.el.removeChild(this.el);
    }

    destroy() {
      this.destroyDom();
      if (this.prev) {
        this.prev.next = this.next;
      }
      if (this.next) {
        this.next.prev = this.prev;
      }
      this.prev = null;
      this.next = null;
      _vDomChildToParentMap.delete(this);
    }
  }

  // class _ContainerVDomNode extends _VDomNode {
  //   constructor(locId, containerType) {
  //     super(null, null, locId);
  //     this.containerType = containerType;
  //   }

  //   getDom() {
  //     let parent = _vDomChildToParentMap.get(this);
  //     while (!parent.el) {
  //       parent = _vDomChildToParentMap.get(parent);
  //     }
  //     return parent.el;
  //   }
  // }

  const _advanceVDom = () => {
    _currentVDom.advanceVDom();
  };

  const _destroyCurrentVDom = () => {
    const vDomToDestroy = _currentVDom;
    _advanceVDom();
    vDomToDestroy.destroy();
  };

  // const _containerHandlerOption = {
  //   creation: (locId, containerType, fn) => {
  //     const containerVDomNode = new _ContainerVDomNode(locId, containerType);
  //     _vDomChildToParentMap.set(containerVDomNode, _parentVDom);
  //     _parentVDom.appendChild(containerVDomNode);
  //     containerVDomNode.children(() => {
  //       if (fn) {
  //         fn(containerVDomNode);
  //       }
  //     });
  //     return containerVDomNode;
  //   },
  //   sync: (locId, containerType, fn) => {
  //     if (_currentVDom.locId !== locId || _currentVDom.containerType !== containerType) {
  //       throw new Error("Can't sync container with vdom");
  //     }
  //     const containerVDomNode = _currentVDom;
  //     containerVDomNode.children(() => {
  //       if (fn) {
  //         fn(containerVDomNode);
  //       }
  //     });
  //   },
  // };

  // let _container = _containerHandlerOption.creation;

  const _getFullLocId = (parentLocId, locId) => {
    return !parentLocId ? locId : (
      Array.isArray(parentLocId) ? parentLocId.concat(locId) : [parentLocId, locId]
    );
  };

  const _createTag = (locId, type, staticProps = {}, props = {}) => {
    Object.assign(props, staticProps);
    const el = document.createElement(type);
    _applyPropsToDomNode(props, el);
    const fullLocId = _getFullLocId(_parentLocId, locId);
    return new _VDomNode(props, el, fullLocId);
  };

  const _appendTag = (locId, type, staticProps = {}, props = {}) => {
    const vDomNode = _createTag(locId, type, staticProps, props);
    _parentVDom.appendChild(vDomNode);
    return vDomNode;
  };

  const _insertTagBefore = (beforeThisNode, locId, type, staticProps = {}, props = {}) => {
    const vDomNode = _createTag(locId, type, staticProps, props);
    beforeThisNode.insertBefore(vDomNode);
    return vDomNode;
  };

  const _insertTagBeforeCurrent = (locId, type, staticProps, props) => {
    return _insertTagBefore(_currentVDom, locId, type, staticProps, props);
  };

  const _tagHandlerOption = {
    creation: _appendTag,
    sync: (locId, type, staticProps, props) => {
      // we know if locIds match, they're the same node type (tag/container) and the same tag type (eg. div)
      let node;
      if (!_currentVDom) {
        // we're starting to sync under a node and there are no children
        node = _appendTag(locId, type, staticProps, props);
      } else {
        const fullLocId = _getFullLocId(_parentLocId, locId);
        // if last rendered were components that can be skipped because they was called
        // w/ the same args, the locIds to skip these will be in _skipNodes
        while (_locIdGreaterThan(fullLocId, _currentVDom.locId) && !_isAfterLastSibling) {
          const shouldSkip = _skipNodes.some(locIdToSkip => _locIdStartsWith(_currentVDom.locId, locIdToSkip));
          if (shouldSkip) {
            _advanceVDom();
          } else {
            _destroyCurrentVDom();
          }
        }
        if (_isAfterLastSibling) {
          node = _appendTag(locId, type, staticProps, props);
        } else {
          if (_locIdEquals(fullLocId, _currentVDom.locId)) {
            if (props) _currentVDom.applyProps(props);
            _advanceVDom();
            node = _currentVDom;
          } else if (_locIdGreaterThan(fullLocId, _currentVDom.locId)) {
            node = _currentVDom;
          } else { // locId < _currentVDom.locId
            node = _insertTagBeforeCurrent(locId, type, staticProps, props);
          }
        }
      }
      _skipNodes = [];
      return node;
    },
  };

  // will be switched to sync after inital render
  let _tagHandler = _tagHandlerOption.creation;

  const _tagDefaultAttributeObj = {
    button: {
      function: `onclick`,
    }
  };

  const _tag = (locId, type, staticArgs, staticProps, args, props) => {
    const resolvedData = _applyDefaults(staticArgs, staticProps, args, props, _tagDefaultAttributeObj[type]);
    return _tagHandler(locId, type, ...resolvedData);
  };

  const _applyPropsToDomNode = (props, el) => {
    for (const [key, value] of Object.entries(props)) {
      el[key] = value;
    }
  };

  const _applyDefaults = (staticArgs, staticProps, args, props, defaults) => {
    const merge = (args, props) => {
      for (let value of args) {
        const type = typeof value;
        const defaultValue = defaults?.[type] || null;
        if (defaultValue !== null) {
          if (typeof defaultValue === "string") {
            // prop name was provided
            props[defaultValue] = value;
          } else {
            // apply fn was provided
            defaultValue(props);
          }
        } else if (type === "string") {
          props.textContent = value;
        }
      }
    };
    if (staticArgs) {
      if (!staticProps) staticProps = {};
      merge(staticArgs, staticProps);
    }
    if (args) {
      if (!props) props = {};
      merge(args, props);
    }
    return [staticProps, props];
  };

  const _withParentLocId = (locId, fn) => {
    let newParentLocId = _parentLocId;
    if (newParentLocId) {
      if (!Array.isArray(newParentLocId)) {
        newParentLocId = [newParentLocId];
      }
      if (!Array.isArray(locId)) {
        locId = [locId];
      }
      newParentLocId = newParentLocId.concat(locId);
    } else {
      newParentLocId = locId;
    }
    const savedParentLocId = _parentLocId;
    _parentLocId = newParentLocId;
    fn();
    _parentLocId = savedParentLocId;
  };

  const _locIdStartsWith = (locId, prefix) => {
    if (Array.isArray(locId)) {
      if (!Array.isArray(prefix)) prefix = [prefix];
      if (locId.length < prefix.length) return false;
      for (let i = 0; i < prefix.length; i++) {
        if (prefix[i] !== locId[i]) {
          return false;
        }
      }
      return true;
    } else {
      return locId === prefix;
    }
  };

  const _locIdEquals = (locId1, locId2) => {
    if (locId1 === locId2) return true;
    if (!Array.isArray(locId1) || !Array.isArray(locId2)) return false;
    if (locId1.length !== locId2.length) return false;
    for (let i = 0; i < locId1.length; i++) {
      if (locId1[i] !== locId2[i]) {
        return false;
      }
    }
    return true;
  };

  const _locIdGreaterThan = (locId1, locId2) => {
    if (!Array.isArray(locId1)) locId1 = [locId1];
    if (!Array.isArray(locId2)) locId2 = [locId2];
    const minLength = Math.min(locId1.length, locId2.length);
    for (let i = 0; i < minLength; i++) {
      const num1 = locId1[i];
      const num2 = locId2[i];
      if (num1 < num2) return false;
      if (num1 > num2) return true;
    }
    if (locId1.length > locId2.length) {
      return true;
    }
    return false; // they're equal
  };

  const _text = (locId, value) => {
    const domNode = document.createTextNode(value);
    const vDomNode = new _VDomNode(null, domNode, _locPath.concat(locId));
    _parentVDom.addChild(vDomNode);
    return vDomNode;
  };

  //== Render Flow Control ====================================

  const _renderIf = (locId, shouldRender, blockFn) => {
    if (shouldRender) {
      _withParentLocId(locId, () => {
        blockFn();
      });
    }
  };

  const _renderFor = (locId, state, list, itemName, blockFn) => {
    if (!list) return;
    const loopStateKey = "for_" + locId;
    let loopStates, forVDomNode;
    if (_initialRender) {
      loopStates = _countingArray(list.length).map(_ => _obj({}));
      state.set(loopStateKey, loopStates);
    } else {
      loopStates = state.get(loopStateKey);
    }
    if (list.actions?.length > 0) {
      let vDomNode = _currentVDom;
      let firstVDomNode = _currentVDom;
      for (const action of list.actions) {
        if (action.actionType === "remove") {
          loopStates.splice(action.index, 1);
          const iterationPrefix = [locId, action.index];
          // fast forward to this iteration
          while (_locIdGreaterThan(iterationPrefix, vDomNode.locId)) {
            vDomNode = vDomNode.next;
          }
          // destroy all vdom nodes for removed index
          while (_locIdStartsWith(vDomNode.locId, iterationPrefix)) {
            const nodeToDestroy = vDomNode;
            if (firstVDomNode === nodeToDestroy) firstVDomNode = nodeToDestroy.next;
            vDomNode = nodeToDestroy.next;
            nodeToDestroy.destroy();
          }
        } else if (action.actionType === "push") {
          loopStates.push(_obj({}));
        } else if (action.actionType === "insert") {
          throw new Error("implement me!");
        } else {
          throw new Error("unhandled action type");
        }
      }
      // if we destroyed the first (prev current) node, reset to new first node
      _currentVDom = firstVDomNode;
    }
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const loopState = loopStates[i];
      _withParentLocId([locId, i], () => {
        blockFn(item, loopState, i);
      });
    }
    // const fullLocId = _getFullLocId(locId);
    // while (_currentVDom && !_locIdGreaterThan(_currentVDom.locId, fullLocId)) {
    //   _destroyCurrentVDom();
    // }
  };

  const _renderWhile = (locId, conditionFn, blockFn) => {
    // TODO if while has state, require a key and use that to sync state
    //      right now, state w/in while loop will be lost every render
    let i = 0;
    while (conditionFn()) {
      const iterationState = null; // TODO add state
      _withParentLocId([locId, i], () => {
        blockFn(iterationState, i);
      });
      i++;
    }
  };

  //== Render =================================================

  const _render = () => {
    _renderBuildFn(_rootDom, () => _topLevelComponents["main.bs"](null, _state, true, ..._state.values()));
  };

  const _renderBuildFn = (domNode, buildFn) => {
    _rootDom = domNode;
    if (_initialRender) {
      _rootVDom = new _VDomNode(null, _domInitialFragment, null);
      _parentVDom = _rootVDom;
      // _container = _containerHandlerOption.creation;
      // _tagHandler = _tagHandlerOption.creation;
      buildFn();
      _rootDom.append(_domInitialFragment);
      _rootVDom.el = _rootDom;
      _initialRender = false;
    } else {
      _skipNodes = [];
      _parentVDom = _rootVDom;
      _currentVDom = _parentVDom.firstChild; // put marker at first node for diff
      _tagHandler = _tagHandlerOption.sync;
      _postChildrenCleanUp = _postChildrenCleanUpOption.sync;
      _isAfterLastSibling = false;
      buildFn();
      for (const cleanUpFn of _cleanUpFns) {
        cleanUpFn();
      }
    }
  }

  //== App ====================================================
/*BROWSER_APP_CODE*/
}
/*
state count = 0
:div "Count: {count}"
:button "More!", -> count++
*/

//   _topLevelComponents["main.bs"] = _component((_state) => {
//     let count;
//     const _state_count = _getState(_state, "count", _ => count = _, () => 0);
//     _tag(1, "h1", ["Counter"]);
//     _tag(1, "div", [], {}, ["Count: " + count]);
//     _tag(8, "button", ["More!"], {onclick: _handle(_fn(() => _state_count.assign(count + 1)))});
//   })
//   _render();
// }

//   _topLevelComponents["main.bs"] = _component((_state) => {
//     let people, sayHi;
//     const _state_people = _getState(_state, "people", _ => people = _,
//       () => _list(_obj({name: "Jim"}), _obj({name: "Jane"}))
//     );
//     _tag(1, "div", ["h1: Niiiice Title"]);
//     _renderIf(2, people.length < 2, () => {
//       _tag(1, "div").children(() => {
//         _tag(1, "b", ["if: Getting low..."]);
//       });
//       _renderIf(2, people.length < 1, () => {
//         _tag(1, "div").children(() => {
//           _tag(1, "b", ["nested if: ONLY 1 LEFT!!"]);
//         });
//       });
//     });
//     _renderFor(3, _state, people, "person", (person, _state) => {
//       _tag(1, "div", [], [], ["for: " + person.get("name")]);
//       _tag(1, "div", [], [], ["for (line 2): " + person.get("name")]);
//     });
//     const _state_sayHi = _getState(_state, "sayHi", _ => sayHi = _,
//       () => _component((_state, person) => {
//         _tag(1, "div", [], [], ["component: " + person.get("name")]);
//         _tag(2, "div", [], [], ["component (line 2): " + person.get("name")]);
//       }, ["person"])
//     );
//     if (people.length > 0) sayHi(4, _state, people.get(0));
//     if (people.length > 1) sayHi(5, _state, people.get(1));
//     const _state_whileNum = _getState(_state, "whileNum", _ => whileNum = _, () => 6);
//     var count = 0;
//     _renderWhile(6, () => count < whileNum, () => {
//       _tag(1, "i", ["while "]);
//       count++;
//     });
//     _tag(7, "button", ["Remove Jim"], {onclick: _handle(_fn(() => _removeWhere(people, _ => _.get("name") === "Jim")))});
//     _tag(8, "button", ["Remove Jane"], {onclick: _handle(_fn(() => _removeWhere(people, _ => _.get("name") === "Jane")))});
//   })
//   _render();
// }

// dom diff tests
// test(
  //   "Change \"hello\" to \"goodbye\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["goodbye"]);
  //   }
  // );

  // test(
  //   "Change 2 \"hello\" siblings to \"goodbye\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello1"]);
  //     _tag(1, "div", [], [], ["hello2"]);
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["goodbye1"]);
  //     _tag(1, "div", [], [], ["goodbye2"]);
  //   }
  // );

  // test(
  //   "Add \"goodbye\" after \"hello\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   }
  // );

  // test(
  //   "Add \"hello\" before \"goodbye\"",
  //   () => {
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   }
  // );

  // test(
  //   "Remove \"goodbye\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //   }
  // );

  // test(
  //   "Remove \"hello\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   },
  //   () => {
  //     _tag(2, "div", [], [], ["goodbye"]);
  //   }
  // );

  // test(
  //   "[don't push me] under hello should be \"good\", then \\n, then \"by\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(2, "div", [], [], ["bye"]);
  //     });
  //   },
  //   () => {
  //     alert("Don't push me!");
  //   }
  // );

  // test(
  //   "Remove \"good\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(2, "div", [], [], ["bye"]);
  //     });
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(2, "div", [], [], ["bye"]);
  //     });
  //   }
  // );

  // test(
  //   "Remove \"bye\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(2, "div", [], [], ["bye"]);
  //     });
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //     });
  //   }
  // );

  // test(
  //   "Replace \"bye\" with \"night\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(3, "div", [], [], ["bye"]);
  //     });
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(2, "div", [], [], ["night"]);
  //     });
  //   }
  // );

  // test(
  //   "Replace \"good\" with \"bad\"",
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(1, "div", [], [], ["good"]);
  //       _tag(3, "div", [], [], ["bye"]);
  //     });
  //   },
  //   () => {
  //     _tag(1, "div", [], [], ["hello"]);
  //     _tag(2, "div").children(() => {
  //       _tag(2, "div", [], [], ["bad"]);
  //       _tag(3, "div", [], [], ["bye"]);
  //     });
  //   }
  // );

  // test(
  //   "Move \"bye\" down to \"red\"",
  //   () => {
  //     _tag(1, "div", [], {style: "background-color: red"}).children(() => {
  //       _tag(1, "div", ["red"]);
  //       _tag(2, "div", [], {style: "background-color: blue"}).children(() => {
  //         _tag(1, "div", ["blue"]);
  //         _tag(2, "div", [], {style: "background-color: white"}).children(() => {
  //           _tag(1, "div", [], {}, ["good"]);
  //           _tag(3, "div", [], {}, ["bye"]);
  //         });
  //       });
  //     });
  //   },
  //   () => {
  //     _tag(1, "div", [], {style: "background-color: red"}).children(() => {
  //       _tag(1, "div", ["red"]);
  //       _tag(2, "div", [], {style: "background-color: blue"}).children(() => {
  //         _tag(1, "div", ["blue"]);
  //         _tag(2, "div", [], {style: "background-color: white"}).children(() => {
  //           _tag(1, "div", [], {}, ["good"]);
  //         });
  //       });
  //       _tag(3, "div", [], {}, ["bye"]);
  //     });
  //   }
  // );

  // function test(label, startFn, onClickFn) {
  //   const displayDiv = document.createElement("div");
  //   displayDiv.style.border = "1px solid black";
  //   document.getElementsByTagName("body")[0].append(displayDiv);

  //   _renderBuildFn(displayDiv, () => {
  //     startFn();
  //   });

  //   const testButtonEl = document.createElement("button");
  //   testButtonEl.textContent = label;
  //   testButtonEl.onclick = () => {
  //     _renderBuildFn(displayDiv, () => {
  //       onClickFn();
  //     });
  //   };
  //   document.getElementsByTagName("body")[0].append(testButtonEl);
  // }

/*

state people = [{name: "Jim"}, {name: "Jane"}]

:h1 "h1: Niiiice Title"
if (people.size < 2)
   :div/:b "Getting low..."
   if (people.size < 1)
     :div/:b "ONLY 1 LEFT!!"
for (person in people)
   :div "Name: {person.name}"
component sayHi(person) ->
   :div "Hi, {person.name}!"
:sayHi people[1]
:sayHi people[2]
state nonJimCount = 0
while (nonJimCount < 2)
   :span "while: "
   for (person in people)
      if (person.name != "Jim")
         :span "{person.name} "
         nonJimCount++
:button "Add Tom", click: -> people.add({name: "Tom"})
:button "Add Dick", click: -> people.add({name: "Dick"})
:button "Remove Jim", click: -> people = people | filter _.name != "Jim"
:button "Add Jane", click: -> people = people | filter _.name != "Jane"

*/