const process = require('process');
const fs = require('fs');
const dotenv = require('dotenv');
const Captcha = require('@haileybot/captcha-generator');

const dc = require('discord.js');
const bot = new dc.Client();

let throttle_count = {};
let throttle_expires = {};
let throttle_ban = {};
let captcha_answer = {};
let captcha_expires = {};

if (process.argv.includes('init')){
    if (!fs.existsSync('.env'))
        fs.copyFileSync('.env.example', '.env');
    if (!fs.existsSync('greetings.txt'))
        fs.copyFileSync('greetings.txt.example', 'greetings.txt');
    if (!fs.existsSync('throttle.txt'))
        fs.copyFileSync('throttle.txt.example', 'throttle.txt');
    if (!fs.existsSync('joined.txt'))
        fs.copyFileSync('joined.txt.example', 'joined.txt');
    console.log("Initial files generated.");
    process.exit();
}

const greetings_message = fs.readFileSync('greetings.txt')
    .toString('utf8');
const throttle_message = fs.readFileSync('throttle.txt')
    .toString('utf8');
const joined_message = fs.readFileSync('joined.txt')
    .toString('utf8');

dotenv.config();

bot.on('ready', function (){
    console.log(`Bot ready, logged in as ${bot.user.tag}!`);
});

const message_handler = async function (message){
    if(message.channel.type !== 'dm' || message.author.bot){
        return;
    }
    let front_guild = bot.guilds.resolve(process.env.FRONT_GUILD_ID);
    let protected_guild = bot.guilds.resolve(process.env.GUARDED_GUILD_ID);
    let usr = await protected_guild.members.fetch(message.author.id).catch(()=>null);
    if(usr !== null){
        await message.channel.send(joined_message);
        let member = await front_guild.members.fetch(message.author.id);
        if(member === null){
            console.log(`${message.author.tag} not exists in shadow server, ignored.`);
        }
        if(!member.hasPermission('ADMINISTRATOR')) {
            console.log(`${message.author.tag} already in the destination server, kicked.`);
            return member.kick('Already in destination server.');
        } else {
            console.log(`${message.author.tag} already in the destination server, ignored because of admin permission.`);
        }
        return;
    }
    if(throttle_ban.hasOwnProperty(message.author.id)){
        return message.channel.send(throttle_message);
    }
    if(!throttle_count.hasOwnProperty(message.author.id)){
        throttle_count[message.author.id] = 0;
    } else {
        throttle_count[message.author.id] += 1;
        if(!throttle_expires.hasOwnProperty(message.author.id)){
            throttle_expires[message.author.id] = setTimeout(function (){
                delete throttle_count[message.author.id];
                delete throttle_expires[message.author.id];
            }, 300000);
        }
        if(throttle_count[message.author.id] > process.env.THROTTLE_FIVE_MIN){
            console.log(`${message.author.tag} reached throttle limit.`);
            throttle_ban[message.author.id] = setTimeout(function (){
                delete throttle_ban[message.author.id];
            }, process.env.THROTTLE_BAN_SECONDS * 1000);
            return message.channel.send(throttle_message);
        }
    }
    if(captcha_expires.hasOwnProperty(message.author.id)){
        clearTimeout(captcha_expires[message.author.id]);
        delete captcha_expires[message.author.id];
    }
    if(
        captcha_answer.hasOwnProperty(message.author.id) &&
        captcha_answer[message.author.id] === message.content.toUpperCase()
    ){
        let ch = protected_guild.channels.resolve(protected_guild.systemChannelID);
        let invite = await ch.createInvite({
            maxAge: 3600,
            maxUses: 1,
            unique: true,
            reason: 'Captcha verified',
        });
        console.log(`${message.author.tag} passed the captcha, attempts: ${throttle_count[message.author.id]}`);
        delete throttle_count[message.author.id];
        if(throttle_ban.hasOwnProperty(message.author.id)){
            clearTimeout(throttle_ban[message.author.id]);
            delete throttle_ban[message.author.id];
        }
        delete captcha_answer[message.author.id];
        delete captcha_expires[message.author.id];
        await message.channel.send(invite.url);
        if(throttle_count[message.author.id] >= process.env.THROTTLE_FIVE_MIN){
            message.channel.send(throttle_message);
        }
        return;
    }
    await message.channel.send(greetings_message);
    let captcha = new Captcha(4);
    captcha_answer[message.author.id] = captcha.value;
    captcha_expires[message.author.id] = setTimeout(function (){
        delete captcha_answer[message.author.id];
    }, 30000);
    let attach = new dc.MessageAttachment(captcha.JPEGStream, 'captcha.jpg');
    console.log(`${message.author.tag} requested new captcha, attempts: ${throttle_count[message.author.id]}`);
    return message.channel.send(attach);
};

bot.on('message', msg => message_handler(msg).catch(function(err){
    console.error(err);
    let message = new dc.MessageEmbed();
    message.setTitle('Sorry, something went wrong :(');
    message.setColor('RED');
    msg.channel.send(message)
        .catch(console.error);
}));

bot.on('guildMemberAdd', (m) => (async function (member) {
    if(member.guild.id === process.env.GUARDED_GUILD_ID){
        console.log(`${member.user.tag} joined destination server.`);
        let front_guild = bot.guilds.resolve(process.env.FRONT_GUILD_ID);
        let mem = await front_guild.members.fetch(member.id).catch(()=>null);
        if(mem === null){
            console.log(`${member.user.tag} not exists in shadow server, ignored.`);
        }
        if(mem.hasPermission('ADMINISTRATOR')) {
            console.log(`${member.user.tag} not kicked from shadow server because of admin permission.`);
        } else {
            console.log(`${mem.user.tag} kicked from shadow server.`);
            return mem.kick('Already in destination server.');
        }
    }
})(m).catch(console.error));

bot.login(process.env.DISCORD_BOT_TOKEN)
    .catch(function (error){
        console.error(error);
        process.exit(1);
    });
