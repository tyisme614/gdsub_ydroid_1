// const CHANNEL_NETFLIX = 'UCWOA1ZGywLbqmigxE4Qlvuw'; //'netflix'
// const CHANNEL_DISNEY = 'UCuaFvcY4MhZY3U43mMt1dYQ'; //'disney'
// const CHANNEL_HBO = 'UCVTQuK2CaWaTgSsoNkn5AiQ'; //'hbo'
// const CHANNEL_UNIVERSAL = 'UCq0OueAsdxH6b8nyAspwViw';  //'universal'
// const CHANNEL_SONY = 'UCz97F7dMxBNOfGYu3rx8aCw';  //'sony'
// const CHANNEL_WARNERBROS = 'UCjmJDM5pRKbUlVIzDYYWb6g'; //'warnerbors'
// const CHANNEL_KINOCHECK = 'UCLRlryMfL8ffxzrtqv0_k_w'; //'kinocheck'
// const CHANNEL_APPLE_TV = 'UC1Myj674wRVXB9I4c6Hm5zA'; //'appletv'
// const CHANNEL_TRAILER_SPOT = 'UCiCSDcAcGDvD_v0TQQ8nxJg'; //'trailerspot'
module.exports = {
    apps : [
        {
            name   : "hbo_reporter",
            script : "./workerMgr.js",
            args   : ["hbo", "UCVTQuK2CaWaTgSsoNkn5AiQ"]
        },
        {
            name   : "netflix_reporter",
            script : "./workerMgr.js",
            args   : ["netflix", "UCWOA1ZGywLbqmigxE4Qlvuw"]
        },
        {
            name   : "sony_reporter",
            script : "./workerMgr.js",
            args   : ["sony", "UCz97F7dMxBNOfGYu3rx8aCw"]
        },
        {
            name   : "universal_reporter",
            script : "./workerMgr.js",
            args   : ["universal", "UCq0OueAsdxH6b8nyAspwViw"]
        },
        {
            name   : "disney_reporter",
            script : "./workerMgr.js",
            args   : ["disney", "UCuaFvcY4MhZY3U43mMt1dYQ"]
        },
        {
            name   : "warnerbros_reporter",
            script : "./workerMgr.js",
            args   : ["warnerbros", "UCjmJDM5pRKbUlVIzDYYWb6g"]
        },
        {
            name   : "kinocheck_reporter",
            script : "./workerMgr.js",
            args   : ["kinocheck", "UCLRlryMfL8ffxzrtqv0_k_w"]
        },
        {
            name   : "appletv_reporter",
            script : "./workerMgr.js",
            args   : ["appletv", "UC1Myj674wRVXB9I4c6Hm5zA"]
        },
        {
            name   : "trailerspot_reporter",
            script : "./workerMgr.js",
            args   : ["trailerspot", "UCiCSDcAcGDvD_v0TQQ8nxJg"]
        }
    ]
}