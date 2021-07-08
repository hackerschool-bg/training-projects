class BaseError extends Error {
    constructor(userMsg, msg, code) {
        super(msg);

        this.userMsg = userMsg;
        this.msg = msg;
        this.code = code;

        console.error(this);
    }
}

class AppError extends BaseError {
    constructor(
        msg,
        userMsg = 'An error occurred and the application might stop behaving properly. Please refresh the page.'
    ) {
        super(userMsg, msg, null);
    }
}

class SystemError extends BaseError {
    constructor(
        msg,
        code,
        userMsg = 'Your browser version is not supported, please consider updating.',
    ) {
        super(userMsg, msg, code);
    }
}

class PeerError extends BaseError {
    constructor(userMsg, code, msg) {
        super(userMsg, msg, code);
    }
}

class UserError extends BaseError {
    constructor(userMsg, code = null, msg = null) {
        super(userMsg, msg, code)
    }
}

function assert(
    condition,
    msg = null,
    userMsg = 'An error occurred and the application might stop behaving properly. Please refresh the page.',
) {
    if (!condition) {
        throw new AppError(msg, userMsg);
    }
}

function assertSystem(
    condition,
    msg,
    code,
    userMsg = 'Your browser version is not supported, please consider updating.',
) {
    if (!condition) {
        throw new SystemError(msg, code, userMsg);
    }
}

function assertPeer(
    condition,
    userMsg,
    code,
    msg,
) {
    if (!condition) {
        throw new PeerError(userMsg, msg, code);
    }
}


function assertUser(
    condition,
    userMsg,
    code,
    msg,
) {
    if (!condition) {
        throw new UserError(userMsg, msg, code);
    }
}

function displayError(error) {
    console.log(error);
    alert(error.userMsg);
}

const errorHandleFunction = (func) => async (...args) => {
    try {
        await func(...args);
    } catch (e) {
        displayError(e);
    }
};

window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error', message, source, lineno, colno, error);
    return false;
};
