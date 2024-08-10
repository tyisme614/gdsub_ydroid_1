const { argv } = require('node:process');
const channelWorker = require('./channelWorker');

const AUTH_KEY = __dirname + '/auth_key.json';
const CHECK_INTERVAL = 3600000; //1 hour
// const CHANNEL_NETFLIX = 'UCWOA1ZGywLbqmigxE4Qlvuw';
//const CHANNEL_DISNEY = 'UCuaFvcY4MhZY3U43mMt1dYQ';
//const CHANNEL_HBO = 'UCVTQuK2CaWaTgSsoNkn5AiQ';
//const CHANNEL_UNIVERSAL = 'UCq0OueAsdxH6b8nyAspwViw';

channelWorker.initialize(AUTH_KEY, argv[2], 32);

let worker = setInterval(doProcess, CHECK_INTERVAL );

function doProcess(){
    channelWorker.process();
}

