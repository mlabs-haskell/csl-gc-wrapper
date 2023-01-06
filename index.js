class PointerStore {
  constructor() {
    this.count = 0;
    this.finRegistry = new FinalizationRegistry((id) => this.freePointer(id));
    this.store = new Map();
  }

  register(obj) {
    // store the pointer
    const id = this.count;
    this.store.set(id, obj);

    // create and register the proxy with the finalization registry
    const px = new Proxy(obj, {});
    this.finRegistry.register(px, id);

    this.count++;
    return px;
  }

  freePointer(id) {
    this.store.get(id).free();
    this.store.delete(id);
  }
}

const refstore = new PointerStore();

module.exports = (lib) => {
  if (lib.__gcPointerStore) { return lib }

  const classWrap = (classObj) => {
    Object.getOwnPropertyNames(classObj).forEach((propName) => {
      if (propName === "__wrap") {
        const oldMethod = classObj[propName];
        classObj[propName] = function () {
          const retVal = oldMethod.apply(classObj, arguments);
          if (retVal && retVal.ptr) {
            return refstore.register(retVal);
          }
          return retVal;
        };
      }
    });
    return classObj;
  };

  Object.keys(lib).forEach((k) => {
    if (k[0].toUpperCase() == k[0] && k[0] != "_") {
      classWrap(lib[k])
    }
  });

  lib.__gcPointerStore = refstore;
  return lib;
};
