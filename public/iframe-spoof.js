(() => {

    try {
        Object.defineProperty(window, "top", {
            get() {
                return window.self;
            }
        });

        Object.defineProperty(window, "parent", {
            get() {
                return window.self;
            }
        });
    } catch (e) {}


    try {
        Object.defineProperty(window, "frameElement", {
            get() {
                return null;
            }
        });
    } catch (e) {}


    try {
        Object.defineProperty(document, "referrer", {
            get() {
                return location.href;
            }
        });
    } catch (e) {}


    try {
        const originalWindowSelf = window.self;

        window.__isTopLevel = true;

        window.__defineGetter__("top", () => originalWindowSelf);
        window.__defineGetter__("parent", () => originalWindowSelf);
    } catch (e) {}

    try {
        Object.defineProperty(window, "self", {
            get() {
                return window;
            }
        });
    } catch (e) {}

    try {
        Object.defineProperty(window, "name", {
            get() {
                return "";
            }
        });
    } catch (e) {}
    
})();