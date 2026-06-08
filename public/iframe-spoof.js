(() => {
    const self_ = window.self;

    const props = {
        top: { get() { return self_; } },
        parent: { get() { return self_; } },
        frameElement: { get() { return null; } },
        self: { get() { return self_; } },
        name: { get() { return ""; }, set() {} },
    };

    for (const [key, descriptor] of Object.entries(props)) {
        try {
            Object.defineProperty(window, key, { ...descriptor, configurable: true });
        } catch {}
    }

    try {
        Object.defineProperty(document, "referrer", {
            get() { return location.href; },
            configurable: true,
        });
    } catch {}

    // spoof window.location.ancestorOrigins
    try {
        Object.defineProperty(location, "ancestorOrigins", {
            get() { return { length: 0, contains: () => false, item: () => null }; },
            configurable: true,
        });
    } catch {}

    // prevent iframe detection via window.length (no child frames)
    try {
        Object.defineProperty(window, "length", {
            get() { return 0; },
            configurable: true,
        });
    } catch {}

    // spoof outerWidth/outerHeight to match innerWidth/innerHeight
    try {
        Object.defineProperty(window, "outerWidth", {
            get() { return window.innerWidth; },
            configurable: true,
        });
        Object.defineProperty(window, "outerHeight", {
            get() { return window.innerHeight; },
            configurable: true,
        });
    } catch {}

    // prevent detection via window == window.top check
    try {
        window.__isTopLevel = true;
    } catch {}
})();