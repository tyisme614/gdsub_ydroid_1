const { argv } = require('node:process');
const channelWorker = require('./channelWorker');

const AUTH_KEY = __dirname + '/auth_key.json';
const CHECK_INTERVAL = 43200000; //12 hours
const redisClient = require('redis');

let redis;
let channel = argv[2];
let channel_id = argv[3];
const CHANNEL_NETFLIX = 'UCWOA1ZGywLbqmigxE4Qlvuw'; //'netflix'
const CHANNEL_DISNEY = 'UCuaFvcY4MhZY3U43mMt1dYQ'; //'disney'
const CHANNEL_HBO = 'UCVTQuK2CaWaTgSsoNkn5AiQ'; //'hbo'
const CHANNEL_UNIVERSAL = 'UCq0OueAsdxH6b8nyAspwViw';  //'universal'
const CHANNEL_SONY = 'UCz97F7dMxBNOfGYu3rx8aCw';  //'sony'
const CHANNEL_KINOCHECK = 'UCLRlryMfL8ffxzrtqv0_k_w'; //'kinocheck'
const CHANNEL_APPLE_TV = 'UC1Myj674wRVXB9I4c6Hm5zA'; //'appletv'
const CHANNEL_TRAILER_SPOT = 'UCiCSDcAcGDvD_v0TQQ8nxJg'; //'trailerspot'
initializeRedis().then(r => {
    redis = r;

    //!!!NOTE: specify target channel in argv[2], candidates: netflix, disney, hbo, universal
    //this is also used as report key in redis
    channelWorker.initialize(AUTH_KEY, redis, argv[2], argv[3], 10, (event) => {
        switch(event){
            case channelWorker.EVENT_INITIALIZED:
                // doProcess();
                let worker = setInterval(doProcess, CHECK_INTERVAL );
                break;
            case channelWorker.EVENT_CALCULATE_COMPLETE:
                console.log(currentTimestamp() + '[workerMgr]' + '[' + channel + '] analysis complete.');
                redis.get(channel).then((data)=>{
                    let json = JSON.parse(data);
                    let report = json.report;
                    let content = 'Report Time:' + currentTimestamp() + '\n' + JSON.stringify(report);
                    // console.log(report.toString());
                    channelWorker.sendMail('yuan@gdsub.com, yuant614@gmail.com',
                        channel.toUpperCase() + '|Daily Report|GDSub_Team',
                        content, null);

                })
                // console.log(report);
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
