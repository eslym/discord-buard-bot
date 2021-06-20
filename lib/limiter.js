const Redis = require('ioredis');
const config = require('./config');

const redis = new Redis({
    host: config('redis.host'),
    port: config('redis.port'),
    password: config('redis.pass'),
    db: config('redis.db'),
    keyPrefix: config('redis.prefix'),
});

async function getAttempts(id){
    return await redis.get(`throttle_limit:${id}`) ?? 0;
}

async function incrAttempts(id){
    let res = await redis.incr(`throttle_limit:${id}`);
    await redis.expire(`throttle_limit:${id}`, config('bot.throttle.period'));
    return res ?? 0;
}

async function clearAttempts(id){
    return await redis.del(`throttle_limit:${id}`) ?? 0;
}

async function isBan(id){
    return !! await redis.get(`throttle_ban:${id}`);
}

async function ban(id){
    await redis.set(`throttle_ban:${id}`, '1', 'EX', config('bot.throttle.ban'));
}

async function getAnswer(id){
    return await redis.get(`captcha:${id}`);
}

async function setAnswer(id, ans){
    return await redis.set(`captcha:${id}`, ans, 'EX', '300');
}

module.exports = {
    getAttempts, incrAttempts, clearAttempts,
    isBan, ban, getAnswer, setAnswer
}
