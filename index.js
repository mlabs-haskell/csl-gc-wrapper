module.exports = (lib) => {
  if (lib.__gcPointerStore) { return lib }

  const finRegistry = new FinalizationRegistry((x) => {
    try {
      x.free()
    } catch (_) {}
  });

  const classWrap = (classObj) => {
    Object.getOwnPropertyNames(classObj).forEach((propName) => {
      if (propName === "__wrap") {
        const oldMethod = classObj[propName];
        classObj[propName] = function () {
          const retVal = oldMethod.apply(classObj, arguments);
          if (retVal && (retVal.__wbg_ptr || retVal.ptr)) {
            const px = new Proxy(retVal, {})
            finRegistry.register(px, retVal, px);
            return px
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

  lib.__gcPointerStore = finRegistry;
  return lib;
};
