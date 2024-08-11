//google APIs
const {google} = require('googleapis');
const youtube = google.youtube('v3');
//nodejs components
const fs = require('fs');
const EventEmitter = require('node:events');

//constants
let TOTAL_VIDEOS = 10;
let CHANNEL = '';
//events
const EVENT_INITIALIZED = 1000;
const EVENT_REQUEST_VIDEO_INFO = 1001;
const EVENT_RANK_VIDEOS = 1002;
const EVENT_CALCULATE_COMPLETE = 1003;

const handler = new EventEmitter();
//local variables
let auth_key = __dirname + '/auth_key.json';
let YOUTUBE_API_KEY, GMAIL_API_KEY;
let videos = [];
let video_map;
let view_map, like_map, favorite_map, comment_map, score_map;
let top_videos, top_views, top_likes, top_comments;






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

});
handler.on(EVENT_RANK_VIDEOS, ()=>{
    calculateStatistics();
});

handler.on(EVENT_CALCULATE_COMPLETE, ()=>{
    generateReport();
});

// handler.on(EVENT_REQUEST_VIDEO_INFO, (videoid) =>{
//
// });

/**
 *
 * public functions
 *
 */
function process(){
    retrieveVideoList(CHANNEL, 'Trailer', TOTAL_VIDEOS);
}

function initialize(_auth, _channel, _total){
    CHANNEL = _channel;
    TOTAL_VIDEOS = _total;
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
                }else{
                    console.log('received video count -->' + videos.length);
                }
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
        if(top_views.length < 3){
            top_views.push(v);
        }
    }

    let sorted_lc = new Map([...like_map.entries()].sort((a, b) => b[0] - a[0]));
    rank = 0;
    // console.log('\nLike Count Rank' + '\n');
    for(let[key, value] of sorted_lc){
        let v = video_map.get(value);
        v.BASE_L = TOTAL_VIDEOS - rank;
        v.rank_l = rank + 1;
        rank++;
        if(top_likes.length < 3){
            top_likes.push(v);
        }
        // console.log('Video:' + v.title + ' BASE_L=' + v.BASE_L);
    }

    let sorted_cc = new Map([...comment_map.entries()].sort((a, b) => b[0] - a[0]));
    rank = 0;
    // console.log('\nComment Count Rank' + '\n');
    for(let[key, value] of sorted_cc){
        let v = video_map.get(value);
        v.BASE_C = TOTAL_VIDEOS - rank;
        v.rank_c = rank + 1;
        rank++;
        if(top_comments.length < 3){
            top_comments.push(v);
        }

        // console.log('Video:' + v.title + ' BASE_C=' + v.BASE_C);
    }

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
        if(top_videos.length < 3){
            top_videos.push(v);
        }
        // console.log('Video:' + v.title + ' BASE_C=' + v.BASE_C);
    }

    handler.emit(EVENT_CALCULATE_COMPLETE);

}

function generateReport(){
    console.log('\nTop Views' + '\n');
    for(let i=0; i<top_views.length; i++){
        let v = top_views[i];
        console.log('No.' + (i+1) + ' Video:' + v.title + '\nTotal Views -->' + v.statistics.view_count);
    }

    console.log('\nTop Likes' + '\n');
    for(let i=0; i<top_likes.length; i++){
        let v = top_likes[i];
        console.log('No.' + (i+1) + ' Video:' + v.title + '\nTotal Likes -->' + v.statistics.like_count);
    }

    console.log('\nTop Comments' + '\n');
    for(let i=0; i<top_comments.length; i++){
        let v = top_comments[i];
        console.log('No.' + (i+1) + ' Video:'  + v.title + '\nTotal Comments -->' + v.statistics.comment_count);
    }

    console.log('\nVideo Rank' + '\n');
    for(let i=0; i<top_videos.length; i++){
        let v = top_videos[i];
        console.log('No.' + (i+1) + ' Video:' + v.title + '\nTotal Score -->' + v.score);
        displayVideoInfo(v);
    }
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
module.exports = {initialize, process}


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
