const { argv } = require('node:process');
const channelWorker = require('./channelWorker');

const AUTH_KEY = __dirname + '/auth_key.json';
const CHECK_INTERVAL = 3600000; //24 hours
const redisClient = require('redis');

let redis;
// const CHANNEL_NETFLIX = 'UCWOA1ZGywLbqmigxE4Qlvuw';
//const CHANNEL_DISNEY = 'UCuaFvcY4MhZY3U43mMt1dYQ';
//const CHANNEL_HBO = 'UCVTQuK2CaWaTgSsoNkn5AiQ';
//const CHANNEL_UNIVERSAL = 'UCq0OueAsdxH6b8nyAspwViw';

initializeRedis().then(r => {
    redis = r;

    //!!!NOTE: specify target channel in argv[2], candidates: netflix, disney, hbo, universal
    //this is also used as report key in redis
    channelWorker.initialize(AUTH_KEY, redis, argv[2], argv[3], 32, (event) => {
        switch(event){
            case channelWorker.EVENT_INITIALIZED:
                doProcess();
                // let worker = setInterval(doProcess, CHECK_INTERVAL );
                break;
            case channelWorker.EVENT_CALCULATE_COMPLETE:
                console.log(currentTimestamp() + '[workerMgr]' + '[' + argv[2] + '] analysis complete.');
                break;
        }
    });
});




async function initializeRedis(){
      const _redis = await redisClient.createClient()
        .on('error', err => console.log('Redis Client Error', err))
        .connect();

     return _redis;
}
function doProcess(){
    channelWorker.process();
}

function currentTimestamp(){
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();

    let hour = date_ob.getHours();
    let minute = date_ob.getMinutes();
    let second = date_ob.getSeconds();

    return '[' + year + "-" + month + "-" + date + '_' + hour + ':' + minute +':' + second + ']';
}
