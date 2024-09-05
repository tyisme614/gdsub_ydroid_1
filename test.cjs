// //google APIs
// const {google} = require('googleapis');
// const youtube = google.youtube('v3');
//
// const fs = require('fs');
//
// let auth_key = __dirname + '/auth_key.json';
// let YOUTUBE_API_KEY, GMAIL_API_KEY;
//
// fs.readFile(auth_key, function(err, data){
//     if(err) {
//         console.log(err);
//     }
//     let raw = JSON.parse(data);
//     YOUTUBE_API_KEY = raw.youtube_apikey;
//     GMAIL_API_KEY = raw.gmail_apikey;
//
//     retrieveVideoList('UCWOA1ZGywLbqmigxE4Qlvuw');
//
//     retrieveVideoInfo('hUqvcd5QgqA');
// });
//
// function retrieveVideoList(channel_id){
//     youtube.search.list({
//         key:YOUTUBE_API_KEY,
//         part: 'snippet',
//         channelId: channel_id,
//         regionCode: 'US',
//         order: 'date',
//         type: 'video',
//         q: 'Trailer',
//         maxResults: 2
//     },(err, res)=>{
//         if(err){
//             console.log(err);
//         }else{
//             console.log('channel -->' + JSON.stringify(res));
//         }
//     });
// }
//
// function retrieveVideoInfo(video_id){
//     youtube.videos.list({
//         key:YOUTUBE_API_KEY,
//         part: 'snippet, statistics',
//         id: video_id,
//         regionCode: 'US'
//     },(err, res)=>{
//         if(err){
//             console.log(err);
//         }else{
//             console.log('video-->' + JSON.stringify(res));
//         }
//     });
// }
//

const redisClient = require("redis");

async function initializeRedis(){
    const _redis = await redisClient.createClient()
        .on('error', err => console.log('Redis Client Error', err))
        .connect();

    let item  = await _redis.get('K0jwAP2fS1E');
    console.log(item);
    return _redis;
}

initializeRedis();
// initializeRedis().then((r)=>{
//     let video = await r.get('cEGBLLRd22A');
//         .then((item)=>{
//             if(item == null){
//                 console.error('item is null');
//             }else
//                 console.log(JSON.stringify(item));
//         }, (err) => {console.error(err.toString())});
// });

