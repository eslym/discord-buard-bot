const fonts = require('../fonts/fonts');
const sampleFonts = Object.keys(fonts);
const Canvas = require('canvas');

for (let family in fonts) {
    if(fonts.hasOwnProperty(family))
        Canvas.registerFont(fonts[family], {family});
}

function randomFont(){
    return sampleFonts[Math.floor(sampleFonts.length * Math.random())];
}

function randomRGB(range = 96, start = 0){
    let rgb = Array(3).fill(0).map(()=>start + Math.floor(Math.random() * range));
    return `rgb(${rgb.join()})`;
}

function createPin(){
    return Array(6).fill(0).map(()=>Math.floor(Math.random() * 10)).join('');
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function randomLine(ctx){
    ctx.lineWidth = 1 + Math.floor(Math.random() * 5);
    let x1 = 10 + Math.floor(Math.random() * 380);
    let x2 = 10 + Math.floor(Math.random() * 380);
    let y1 = 10 + Math.floor(Math.random() * 80);
    let y2 = 10 + Math.floor(Math.random() * 80);
    switch(Math.floor(Math.random() * 6)){
        case 0:
            x1 = 0; x2 = 400;
            break;
        case 1:
            y1 = 0; y2 = 100;
            break;
        case 2:
            x1 = 0; y2 = 0;
            break;
        case 3:
            x1 = 0; y2 = 100;
            break;
        case 4:
            x1 = 400; y2 = 0;
            break;
        case 5:
            x1 = 400; y2 = 100;
            break;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.stroke();
}

function createCaptcha(){
    let can = Canvas.createCanvas(400, 100);
    let ctx = can.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 100);
    for(let i = 0; i < 10; i ++){
        ctx.strokeStyle = randomRGB(96, 160);
        randomLine(ctx);
    }
    ctx.save();
    ctx.translate(200, 50);
    let rotate = (Math.random() * 21) - 10;
    ctx.rotate(rotate * Math.PI / 180);
    let fontSize = 50 + Math.floor(Math.random() * 20);
    ctx.font = `${fontSize}px '${randomFont()}'`;
    ctx.fillStyle = randomRGB();
    let pin = createPin();
    let size = ctx.measureText(pin);
    let x = -190 + Math.floor(Math.random() * (380 - size.width));
    let y = 10 + Math.floor(Math.random() * 20);
    ctx.fillText(pin, x, y);
    ctx.restore();
    ctx.lineCap = 'round'
    for(let i = 0; i < 10; i ++){
        ctx.strokeStyle = randomRGB();
        randomLine(ctx);
    }
    return {
        answer: pin,
        canvas: can,
    }
}

module.exports = createCaptcha;
module.exports.createPin = createPin;
