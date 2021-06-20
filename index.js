/**
 * @typedef {{message: dc.Message, clicker: {user:dc.User, member: dc.GuildMember}, channel: dc.Channel, id: string}} ButtonEvent
 */

const {MessageActionRow, MessageButton} = require("discord-buttons");

const process = require('process');
const fs = require('fs');
const logger = require('./lib/logger');

const createCaptchaCanvas = require('./lib/captcha');

const dc = require('discord.js');
const bot = new dc.Client();

const dcBtn = require('discord-buttons');

dcBtn(bot);

if (process.argv.includes('init')){
    if (!fs.existsSync('config.yml'))
        fs.copyFileSync('config.yml.example', 'config.yml');
    logger.log("Initial files generated.");
    process.exit();
}

const config = require('./lib/config');
const limiter = require('./lib/limiter');

bot.on('ready', function (){
    logger.log(`Bot ready, logged in as ${bot.user.tag}(${bot.user.id}).`);
});

/**
 * @param {dc.TextChannel} channel
 * @param {dc.User} user
 */
async function sendCaptcha(channel, user){
    let captcha = createCaptchaCanvas();
    await limiter.setAnswer(user.id, captcha.answer);
    let msg = new dc.MessageEmbed();
    msg.setImage('attachment://captcha.jpg');
    msg.attachFiles([new dc.MessageAttachment(captcha.canvas.createJPEGStream(), 'captcha.jpg')]);
    let choices = Array(4).fill(0).map(()=>createCaptchaCanvas.createPin());
    choices.push(captcha.answer);
    choices.sort(()=>Math.random() - 0.5);
    let row = new MessageActionRow();
    for (let choice of choices) {
        let btn = new MessageButton();
        btn.setID('server_guard_captcha_ans_'+choice);
        btn.setStyle('green');
        btn.setLabel(choice);
        row.addComponent(btn);
    }
    let reset = new MessageButton();
    reset.setID('server_guard_captcha_reload');
    reset.setStyle('grey');
    reset.setLabel(config('lang.button.reset'));
    let row2 = new MessageActionRow();
    row2.addComponent(reset);
    logger.log(`${user.tag}(${user.id}) requested new captcha.`);
    return channel.send(config('lang.message.send'), {embed: msg, components: [row, row2] });
}

/** @param {dc.Message} message */
const message_handler = async function ( message){
    if(message.channel.type !== 'dm' || message.author.bot){
        return;
    }
    let front_guild = bot.guilds.resolve(config('bot.server.shadow'));
    let member = await front_guild.members.fetch(message.author.id).catch(()=>null);
    if(member === null){
        // Ignore when the author is not in the shadow server.
        return;
    }
    let protected_guild = bot.guilds.resolve(config('bot.server.guarded'));
    let usr = await protected_guild.members.fetch(message.author.id).catch(()=>null);
    if(usr !== null){
        if(!member.hasPermission('ADMINISTRATOR')) {
            logger.log(`${message.author.tag}(${message.author.id}) already in the destination server, kicked.`);
            return member.kick('Already in destination server.');
        } else {
            logger.log(`${message.author.tag}(${message.author.id}) already in the destination server, ignored because of admin permission.`);
        }
        return;
    }
    if(await limiter.isBan(message.author.id)){
        return message.channel.send(config('lang.message.throttle'));
    }
    if(await limiter.isBan(message.author.id)){
        return message.channel.send(config('lang.message.throttle'));
    }
    return sendCaptcha(message.channel, message.author);
};

bot.on('message', msg => message_handler(msg).catch(function(err){
    logger.error(err);
    let message = new dc.MessageEmbed();
    message.setTitle('Sorry, something went wrong :(');
    message.setColor('RED');
    msg.channel.send(message)
        .catch(logger.error);
}));

/** @param {ButtonEvent} btn */
let button_handler = async (btn)=>{
    if(btn.id.startsWith('server_guard_captcha')){
        await btn.defer();
        await btn.message.delete();
        if(btn.id === 'server_guard_captcha_reload'){
            return sendCaptcha(btn.channel, btn.clicker.user);
        }
        let ans = btn.id.replace('server_guard_captcha_ans_', '');
        let attempts = await limiter.incrAttempts(btn.clicker.user.id);
        if(ans === await limiter.getAnswer(btn.clicker.user.id)){
            await limiter.clearAttempts(btn.clicker.user.id);
            logger.log(`${btn.clicker.user.tag}(${btn.clicker.user.id}) passed captcha, attempts: ${attempts}.`);
            let protected_guild = await bot.guilds.fetch(config('bot.server.guarded'));
            let ch = protected_guild.channels.resolve(protected_guild.systemChannelID);
            let invite = await ch.createInvite({
                maxAge: 3600,
                maxUses: 1,
                unique: true,
                reason: 'Captcha verified',
            });
            let join = new MessageButton();
            join.setLabel(config('lang.button.join'));
            join.setStyle('url');
            join.setURL(invite.url);
            return btn.channel.send(config('lang.message.success'), {component: join});
        } else {
            if(attempts >= config('bot.throttle.limit')){
                await limiter.ban(btn.clicker.user.id);
                logger.log(`${btn.clicker.user.tag}(${btn.clicker.user.id}) banned.`);
                return btn.channel.send(config('lang.message.throttle'));
            } else {
                logger.log(`${btn.clicker.user.tag}(${btn.clicker.user.id}) failed captcha, attempts: ${attempts}.`);
                return btn.channel.send(config('lang.message.failed'));
            }
        }
    }
};

bot.on('clickButton', btn => button_handler(btn).catch(function(err){
    logger.error(err);
    let message = new dc.MessageEmbed();
    message.setTitle('Sorry, something went wrong :(');
    message.setColor('RED');
    btn.channel.send(message)
        .catch(logger.error);
}));

bot.on('guildMemberAdd', (m) => (async function (member) {
    if(member.guild.id === config('bot.server.guarded')){
        logger.log(`${member.user.tag}(${member.user.id}) joined destination server.`);
        let front_guild = bot.guilds.resolve(config('bot.server.shadow'));
        let mem = await front_guild.members.fetch(member.id).catch(()=>null);
        if(mem === null){
            logger.log(`${member.user.tag}(${member.user.id}) not exists in shadow server, ignored.`);
        }
        if(mem.hasPermission('ADMINISTRATOR')) {
            logger.log(`${member.user.tag}(${member.user.id}) not kicked from shadow server because of admin permission.`);
        } else {
            logger.log(`${mem.user.tag}(${member.user.id}) kicked from shadow server.`);
            return mem.kick('Already in destination server.');
        }
    }
})(m).catch(logger.error));

bot.login(config('bot.token'))
    .catch(function (error){
        logger.error(error);
        process.exit(1);
    });
