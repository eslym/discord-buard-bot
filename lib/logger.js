const ansi = require('ansi-escape-sequences');
const Console = require('console').Console;

const _console = new Console({
    stdout: process.stdout,
    stderr: process.stderr,
    colorMode: false,
});

const config = {
    log: {
        color: ansi.style.white,
        io: process.stdout,
    },
    info: {
        color: ansi.style.green,
        io: process.stdout,
    },
    debug: {
        color: ansi.style.cyan,
        io: process.stdout,
    },
    warn: {
        color: ansi.style.yellow,
        io: process.stderr,
    },
    error: {
        color: ansi.style.red,
        io: process.stderr,
    },
}

const logger = {};

for (const fn of Object.keys(config)) {
    logger[fn] = function (){
        config[fn].io.write(`${config[fn].color}[${(new Date()).toISOString()}][${fn.toUpperCase()}] `);
        _console[fn].apply(_console, arguments);
    }
}

/**
 * @typedef {function(data: ...any):void} LogFn
 * @type {{log: LogFn, info: LogFn, debug: LogFn, warn: LogFn, error: LogFn}}
 */
module.exports = logger;
