/*
 * Serve JSON to our AngularJS client
 */
var readdirp = require('readdirp');
var path = require('path');
var id3 = require('id3js');
var request = require('request');
var fs = require('fs');

// loading playlists
var data = require('../db.json');

// building library
data.library = [];
readdirp({ root: path.join(__dirname, '../public/library'), fileFilter: '*.mp3' })
  .on('warn', function (err) {
    console.error('something went wrong when processing an entry', err);
  })
  .on('error', function (err) {
    console.error('something went fatally wrong and the stream was aborted', err);
  })
  .on('data', function (entry) {
    var location = path.join(__dirname, '../public/library')+ '/' + entry.path;
    id3({ file: location, type: id3.OPEN_LOCAL }, function(err, tags) {
      if (err != undefined) console.log(location + ' Error:' + err);
      var song = {
        "path": entry.path,
        "name": tags.artist + ' - ' + tags.title
        // we could use "cover": tags.v2.image
      }
      song.name = song.name.replace(/\0/g, '');
      data.library.push(song);
      console.log(song.name + ' loaded (' + data.library.length + ' total)');
    });
  });

function saveDatabase() {
  var newDb = {
    playlists: data.playlists
  }
  fs.writeFile('./db.json', JSON.stringify(newDb), function(err) {
    //console.log(err);
  })
}

exports.playlist = function (req, res) {
  var pid = req.params.id;
  for (var i = 0; i < data.playlists.length; i++) {
    if (pid == data.playlists[i].pid){
      res.json(data.playlists[i]);
      return;
    }
  }
  res.json(false);
};

exports.playlists = function (req, res) {
  var playlists = [];
  for (var i = 0; i < data.playlists.length; i++) {
    playlists.push({
      pid: data.playlists[i].pid,
      title: data.playlists[i].title
    });
  }
  res.json(playlists);
};

exports.addSongToPlaylist = function (req, res) {
  var pid = req.params.id;
  var song = req.body;
  for (var i = 0; i < data.playlists.length; i++) {
    if (pid == data.playlists[i].pid){
      data.playlists[i].songs.push(song);
      saveDatabase();
      res.json(true);
    }
  }
};

exports.addSongToPlaylistFromURL = function (req, res) {
  var pid = req.params.id;
  for (var i = 0; i < data.playlists.length; i++) {
    if (pid == data.playlists[i].pid){
      var playlistIndex = i;

      var myregexp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
      var regExResult = req.body.url.match(myregexp);
      if (regExResult != null) {
        // its a youtube url
        var videoId = regExResult[1];
        var url = "http://gdata.youtube.com/feeds/api/videos/" + videoId + "?v=2&alt=json";
        request(url, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var videoTitle = JSON.parse(body).entry.title.$t;
            var song = {
              "type": "youtube",
              "name": videoTitle,
              "videoId": videoId
            }
            data.playlists[playlistIndex].songs.push(song);
            saveDatabase();
            res.json(true);
          }
        });
      }
      else
      {
        // must be soundcloud then
        console.log
        var url = 'http://api.soundcloud.com/resolve.json?client_id=YOUR_CLIENT_ID&url='+req.body.url;
        request(url, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)
            var song = {
              "type": "soundcloud",
              "name": result.title,
              "url": result.permalink_url
            }
            data.playlists[playlistIndex].songs.push(song);
            saveDatabase();
            res.json(true);
          }
        });
      }
    }
  }
};

exports.swap = function (req, res) {
  var pid = req.params.id;
  var songId = parseInt(req.params.songId);
  for (var i = 0; i < data.playlists.length; i++) {
    if (pid == data.playlists[i].pid){
      if (0 <= songId && songId < data.playlists[i].songs.length-1) {
        var song = data.playlists[i].songs[songId];
        data.playlists[i].songs.splice(songId,1);
        data.playlists[i].songs.splice(songId+1,0,song);
        saveDatabase();
        res.json(data.playlists[i].songs);
      }
    }
  }
};

exports.deleteSongFromPlaylist = function (req, res) {
  var pid = req.params.id;
  for (var i = 0; i < data.playlists.length; i++) {
    if (pid == data.playlists[i].pid){
      data.playlists[i].songs.splice(req.params.songid, 1);
      saveDatabase();
      res.json(true);
    }
  }
};

exports.searchLibrary = function (req, res) {
  var query = req.params.query.toLowerCase();
  var songs = [];
  var queryWords = query.split(' ');

  for (var i = 0; i < data.library.length; i++) {
    var occurences = 0;
    for (var y = 0; y < queryWords.length; y++) {
      if (JSON.stringify(data.library[i]).toLowerCase().indexOf(queryWords[y]) > -1) {
        occurences++;
      }
    }
    if (occurences == queryWords.length) {
      songs.push({
        type: 'library',
        name: data.library[i].name,
        path: data.library[i].path
      });
    }
  }
  res.json(songs);
};

exports.searchSoundcloud = function (req, res) {
  var query = req.params.query.toLowerCase();
  var songs = [];
  var url = "http://api.soundcloud.com/tracks.json?client_id=YOUR_CLIENT_ID&q=" + query;
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body);
      for (var i = 0; i < results.length; i++) {
        songs.push({
          "type": "soundcloud",
          "name": results[i].title,
          "url": results[i].permalink_url
        });
      }
      res.json(songs);
    } else {
      console.log(error);
    }
  });
};

exports.searchYoutube = function (req, res) {
  var query = req.params.query.toLowerCase();
  var songs = [];
  var url = "https://gdata.youtube.com/feeds/api/videos/?alt=json&q=" + query;
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body).feed.entry;
      var myregexp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
      if (results != null) {
        for (var i = 0; i < results.length; i++) {
          var regExResult = results[i].id.$t.match(myregexp);
          var videoId = regExResult[1];
          songs.push({
            "type": "youtube",
            "name": results[i].title.$t,
            "videoId": videoId
          });
        }
      }
      res.json(songs);
    } else {
      console.log(error);
    }
  });
};

// exports.cover = function (req, res) {
//   var id = req.params.id;
//   for (var i = 0; i < data.library.length; i++) {
//     if (id == data.library[i].id){
//       res.json(data.library[i].cover);
//       return;
//     }
//   }
//   res.json(false);
// };
