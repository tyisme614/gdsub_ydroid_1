//google APIs
const {google} = require('googleapis');
const youtube = google.youtube('v3');
//nodejs components
const fs = require('fs');
const EventEmitter = require('node:events');

//analysis parameters
let TOTAL_VIDEOS = 32;
let CHANNEL = '';
let CHANNEL_ID = '';
let TOP_COUNT = 10;
//events
const EVENT_INITIALIZED = 1000;
const EVENT_REQUEST_VIDEO_INFO = 1001;
const EVENT_RANK_VIDEOS = 1002;
const EVENT_CALCULATE_COMPLETE = 1003;
const EVENT_CACHE_DATA_IN_REDIS = 1004;

const REDIS_KEY_TOP_VIEWS_LIST = 'top.views.list';
const REDIS_KEY_TOP_LIKES_LIST = 'top.likes.list';
const REDIS_KEY_TOP_COMMENTS_LIST = 'top.comments.list';
const REDIS_KEY_TOP_VIDEOS_LIST = 'top.videos.list';

const handler = new EventEmitter();
//local variables
let analyzing = false;
let auth_key = __dirname + '/auth_key.json';
let YOUTUBE_API_KEY, GMAIL_API_KEY;
let videos = [];
let video_map;
let view_map, like_map, favorite_map, comment_map, score_map;
let top_videos, top_views, top_likes, top_comments;
let callback = null;
let redis = null;
/**
 *
 *
 * event handlers
 *
 */
handler.on(EVENT_INITIALIZED, ()=>{
    videos = [];
    video_map = new Map();
    view_map = new Map();
    like_map = new Map();
    favorite_map = new Map();
    comment_map = new Map();
    score_map = new Map();
    top_videos = [];
    top_views = [];
    top_likes = [];
    top_comments = [];
    if(callback != null){
        callback(EVENT_INITIALIZED);
    }
});
handler.on(EVENT_RANK_VIDEOS, ()=>{
    calculateStatistics();
});

handler.on(EVENT_CALCULATE_COMPLETE, ()=>{
    analyzing = false;
    let report = generateReport();
    handler.emit(EVENT_CACHE_DATA_IN_REDIS, CHANNEL, report);
    // generateReport();
    if(callback != null){
        callback(EVENT_CALCULATE_COMPLETE);
    }
});

handler.on(EVENT_CACHE_DATA_IN_REDIS, (key, value) => {
    if( redis != null){
        redis.set(key, value);
    }else{
        console.log('redis is not initialized...');
    }

});


/**
 *
 * public functions
 *
 */

/**
 *
 *
 * @param _callback
 *      [prototype] function(event:number)
 *      notify the main thread that the processing is complete.
 */
function process(){
    analyzing = true;
    retrieveVideoList(CHANNEL_ID, 'Official Trailer', TOTAL_VIDEOS);

}

function isAnalyzing(){
    return analyzing;
}

function initialize(_auth, _redis, _channel, _channel_id, _total, _callback){
    callback = _callback;
    CHANNEL = _channel;
    CHANNEL_ID = _channel_id;
    TOTAL_VIDEOS = _total;
    redis = _redis;
    fs.readFile(_auth, function(err, data){
        if(err) {
            console.log(err);
        }
        let raw = JSON.parse(data);
        YOUTUBE_API_KEY = raw.youtube_apikey;
        GMAIL_API_KEY = raw.gmail_apikey;
        handler.emit(EVENT_INITIALIZED);

    });

}
/**
 *
 *
 *
 * local functions
 *
 *
 *
 */

function retrieveVideoList(channel_id, keyword, maxRes){
    youtube.search.list({
        key:YOUTUBE_API_KEY,
        part: 'snippet',
        channelId: channel_id,
        regionCode: 'US',
        order: 'date',
        type: 'video',
        q: keyword,
        maxResults: maxRes
    },(err, res)=>{
        if(err){
            console.log(err);
        }else{
            // console.log('channel -->' + JSON.stringify(res));
            let items = res.data.items;

            for(let i=0; i<items.length; i++){
                let item = items[i];
                let _video_id = item.id.videoId;
                retrieveVideoInfo(_video_id);
            }

        }
    });
}

function retrieveVideoInfo(id){
    /**
     * ****
     * video object
     * **
     * video_id : string
     * title : string
     * description : string
     * publish_time : string
     * update_time : string
     * statistics : object
     * score : number
     * rank_v : number
     * rank_l : number
     * rank_c : number
     * ****
     * statistics
     * **
     * view_count : number
     * like_count : number
     * favorite_count : number
     * comment_count : number
     */
    youtube.videos.list({
        key:YOUTUBE_API_KEY,
        part: 'snippet, statistics',
        id: id,
        regionCode: 'US'
    },(err, res)=>{
        if(err){
            console.log(err);
        }else{
            // console.log('video-->' + JSON.stringify(res));

            if(res.data.items.length >= 1 ){
                let item = res.data.items[0].snippet;
                let _video_id = id;
                let _title = item.title;
                let _description = item.description;
                let _publish_time = item.publishAt;
                let _statistics = res.data.items[0].statistics;
                let _view_count = _statistics.viewCount;
                let _like_count = _statistics.likeCount;
                let _favorite_count = _statistics.favoriteCount;
                let _comment_count = _statistics.commentCount;
                let v = {
                    video_id : _video_id,
                    title : _title,
                    description : _description,
                    publish_time : _publish_time,
                    update_time : new Date(),
                    statistics : {
                        view_count : _view_count,
                        like_count : _like_count,
                        favorite_count : _favorite_count,
                        comment_count : _comment_count
                    },
                    BASE_V : 0,
                    BASE_C : 0,
                    BASE_L : 0,
                    score : 0,
                    rank_v : 0,
                    rank_c : 0,
                    rank_l : 0,
                    rank_total : 0

                }
                videos.push(v);
                video_map.set(_video_id, v);
                view_map.set(_view_count, _video_id);
                like_map.set(_like_count, _video_id);
                favorite_map.set(_favorite_count, _video_id);
                comment_map.set(_comment_count, _video_id);
                if(videos.length >= TOTAL_VIDEOS){
                    handler.emit(EVENT_RANK_VIDEOS);
                }
                // else{
                //     console.log('received video count -->' + videos.length);
                // }
            }


        }
    });
}


function calculateStatistics(){
    let sorted_vc = new Map([...view_map.entries()].sort((a, b) => b[0] - a[0]));
    let rank = 0;
    // console.log('\nView Count Rank' + '\n');
    for(let[key, value] of sorted_vc){
        let v = video_map.get(value);
        v.BASE_V = TOTAL_VIDEOS - rank;
        v.rank_v = rank + 1;
        rank++;
        // console.log('Video:' + v.title + ' BASE_V=' + v.BASE_V);
        if(top_views.length < TOP_COUNT){
            top_views.push(v);
        }
    }

    //cache top views list
    handler.emit(EVENT_CACHE_DATA_IN_REDIS, REDIS_KEY_TOP_VIEWS_LIST, JSON.stringify(top_views));

    let sorted_lc = new Map([...like_map.entries()].sort((a, b) => b[0] - a[0]));
    rank = 0;
    // console.log('\nLike Count Rank' + '\n');
    for(let[key, value] of sorted_lc){
        let v = video_map.get(value);
        v.BASE_L = TOTAL_VIDEOS - rank;
        v.rank_l = rank + 1;
        rank++;
        if(top_likes.length < TOP_COUNT){
            top_likes.push(v);
        }
        // console.log('Video:' + v.title + ' BASE_L=' + v.BASE_L);
    }
    //cache top likes list
    handler.emit(EVENT_CACHE_DATA_IN_REDIS, REDIS_KEY_TOP_LIKES_LIST, JSON.stringify(top_likes));

    let sorted_cc = new Map([...comment_map.entries()].sort((a, b) => b[0] - a[0]));
    rank = 0;
    // console.log('\nComment Count Rank' + '\n');
    for(let[key, value] of sorted_cc){
        let v = video_map.get(value);
        v.BASE_C = TOTAL_VIDEOS - rank;
        v.rank_c = rank + 1;
        rank++;
        if(top_comments.length < TOP_COUNT){
            top_comments.push(v);
        }

        // console.log('Video:' + v.title + ' BASE_C=' + v.BASE_C);
    }
    //cache top comments list
    handler.emit(EVENT_CACHE_DATA_IN_REDIS, REDIS_KEY_TOP_COMMENTS_LIST, JSON.stringify(top_comments));

    for(let[key, value] of video_map){
        let v = value;
        v.score = 0.2 * v.BASE_V + 0.5 * v.BASE_C + 0.3 * v.BASE_L;
        score_map.set(v.score, v);
        // displayVideoInfo(v);
    }

    let sorted_scores = new Map([...score_map.entries()].sort((a, b) => b[0] - a[0]));
    rank = 0;
    for(let[key, value] of sorted_scores){
        let v = value;
        v.rank_total = rank + 1;
        rank++;
        if(top_videos.length < TOP_COUNT){
            top_videos.push(v);
        }
        handler.emit(EVENT_CACHE_DATA_IN_REDIS, v.video_id, JSON.stringify(v));
        // console.log('Video:' + v.title + ' BASE_C=' + v.BASE_C);
    }
    //cache top videos list
    handler.emit(EVENT_CACHE_DATA_IN_REDIS, REDIS_KEY_TOP_VIDEOS_LIST, JSON.stringify(top_videos));

    handler.emit(EVENT_CALCULATE_COMPLETE);

}

function generateReport(){
    let report = '';
    report += '\n[Top Views]' + '\n'

    for(let i=0; i<top_views.length; i++){
        let v = top_views[i];
        report += 'No.' + (i+1) + ' Video:' + v.title + '\nTotal Views -->' + v.statistics.view_count + '\n';

    }

    report += '\n[Top Likes]' + '\n';
    for(let i=0; i<top_likes.length; i++){
        let v = top_likes[i];
        report += 'No.' + (i+1) + ' Video:' + v.title + '\nTotal Likes -->' + v.statistics.like_count + '\n';

    }

    report += '\n[Top Comments]' + '\n';
    for(let i=0; i<top_comments.length; i++){
        let v = top_comments[i];
        report += 'No.' + (i+1) + ' Video:'  + v.title + '\nTotal Comments -->' + v.statistics.comment_count + '\n';
    }

    report += '\n[Video Rank]' + '\n';

    for(let i=0; i<top_videos.length; i++){
        let v = top_videos[i];
        report += 'No.' + (i+1) + ' Video:' + v.title + '\nTotal Score -->' + v.score + '\n';
        report += getVideoInfoText(v) + '\n';
    }

    return report;
}

function getVideoInfoText(v){
    let message = '\n[VIDEO INFO]' + '\n'
        + 'Video Title:' + v.title  + '\n'
        + 'Video ID:' + v.video_id  + '\n'
        + 'Video Score:' + v.score  + '\n'
        + 'Views Count Rank:' + v.BASE_V  + '\n'
        + 'Likes Count Rank:' + v.BASE_L  + '\n'
        + 'Comments Count Rank:' + v.BASE_C  + '\n';
    return message;

}

function displayVideoInfo(v){
    let message = '\n[VIDEO INFO]' + '\n'
        + 'Video Title:' + v.title  + '\n'
        + 'Video ID:' + v.video_id  + '\n'
        + 'Video Score:' + v.score  + '\n'
        + 'Views Count Rank:' + v.BASE_V  + '\n'
        + 'Likes Count Rank:' + v.BASE_L  + '\n'
        + 'Comments Count Rank:' + v.BASE_C  + '\n';

    console.log(message);

}

//exports
module.exports = {initialize, process, isAnalyzing, generateReport, getVideoInfoText,
    EVENT_CALCULATE_COMPLETE, EVENT_INITIALIZED};


/***
 *
 *
 *
 *
 * end of file
 *
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌
 * ▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌
 * ▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌
 * ▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄╔══╗▄▄╔╗╔╗▄▄▄▄▄▄╔╗▄▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄║║║╠╦╗║╚╝╠═╦═╗╔╦╣╚╗▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄║║║║║║║╔╗║╩╣║╚╣╔╣╔╣▄▄▄▄▄▄▄▄▄▄▌
 * ▄▄▄▄▄▄▄▄▄▄▄▄╚╩╩╬╗║╚╝╚╩═╩══╩╝╚═╝▄▄▄▄▄▄▄▄▄▌▌
 * ▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄╚═╝▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌
 * ▌▌▄▄▄▄▄▄▄▄▄▄▄▄╔═╗▄▄▄▄╔═╦╗▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌
 * ▌▌▌▄▄▄▄▄▄▄▄▄▄▄║═╬═╦╦╗╚╗║╠═╦╦╗▄▄▄▄▄▄▄▄▄▌▌▌▌
 * ▌▌▌▌▄▄▄▄▄▄▄▄▄▄║╔╣║║╔╝╔╩╗║╬║║║▄▄▄▄▄▄▄▄▌▌▌▌▌
 * ▌▌▌▌▌▄▄▄▄▄▄▄▄▄╚╝╚═╩╝▄╚══╩═╩═╝▄▄▄▄▄▄▄▌▌▌▌▌▌
 * ▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▄▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▄▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 * ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
 *
 *
 */
