const YAML = require('yaml');
const path = require('path');
const fs = require('fs');
const jp = require('jsonpath');

function deepMerge(target, source){
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], deepMerge(target[key], source[key]))
    }

    // Join `target` and modified `source`
    Object.assign(target || {}, source)
    return target
}

const configPath = path.resolve(__dirname, '../config.yml');
let config = YAML.parse(fs.readFileSync(configPath + '.example').toString('utf8'));
if(fs.existsSync(configPath)){
    config = deepMerge(config, YAML.parse(fs.readFileSync(configPath).toString('utf8')));
}

module.exports = function (path, def){
    let res = jp.query(config, path, 1);
    if(res instanceof Array){
        switch (res.length){
            case 0:
                return undefined;
            case 1:
                return res[0];
            default:
                return res;
        }
    }
    return res === undefined ? def : res;
};
