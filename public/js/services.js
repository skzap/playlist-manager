'use strict';

/* Services */

angular.module('myApp.services', []).
  value('version', '0.1').
  factory('torrentclient', function () {
    return null;
  }).
  factory('htmlplayer', ['$document', '$rootScope', function ($document, $rootScope) {
    var audioElement = $document[0].createElement('audio');
    var htmlplayer = {
      audioElement: audioElement,
      loadAndPlay: function(filename) {
        audioElement.src = filename;
        this.play();
      },
      play: function() {
        audioElement.play();
        this.ended = false;
      },
      pause: function() {
        audioElement.pause();
      },
      setVolume: function(volume) {
        if (volume != null)
          audioElement.volume = volume/100;
      },
      setTime: function(currentTime) {
        audioElement.currentTime = currentTime;
      },
      setCover: function(cover) {
        var arrayBuffer = cover.data;
        var bytes = new Uint8Array(arrayBuffer);

        var image = document.getElementById('cover');
        image.src = 'data:image/jpeg,'+encode(bytes);
      }
    }
    audioElement.addEventListener('ended', function() {
      $rootScope.$apply();
    });
    audioElement.addEventListener('timeupdate', function() {
      $rootScope.$apply();
    });

    return htmlplayer;
  }]).
  factory('ytplayer', ['$window', '$rootScope', '$interval', function ($window, $rootScope, $interval) {
    var ytplayer = {
      "embedPlayer":null,
      "videoId":null,
      "height":200,
      "width":355,
      "isReady": false,
      "isPaused": true,
      "duration": 0,
      "currentTime": 0,
      "ended": false,
      loadPlayer: function () {
        this.embedPlayer = new YT.Player('ytplayer', {
          height: this.height,
          width: this.width,
          videoId: this.videoId,
          events: {
            'onReady': onYoutubeReady,
            'onStateChange': onYoutubeStateChange
          },
          playerVars: {
            'controls': 0,
            'iv_load_policy': 3,
            'rel': 0,
            'showinfo': 0,
            'theme': 'light'
          }
        });
      },
      loadVideoById: function(id) {
        this.embedPlayer.loadVideoById(id);
      },
      getDuration: function() {
        return this.embedPlayer.getDuration();
      },
      setVolume: function(volume) {
        if (this.embedPlayer != null)
          this.embedPlayer.setVolume(volume);
      },
      insertScript: function () {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        console.log('Youtube API loading ...');
      }
    };
    $window.onYouTubeIframeAPIReady = function () {
      console.log('Youtube API is ready');
      ytplayer.isReady = true;
      ytplayer.loadPlayer();
    };
    function onYoutubeStateChange (event) {
      if (event.data == YT.PlayerState.PLAYING) {
        ytplayer.isPaused = false;
        ytplayer.duration = ytplayer.embedPlayer.getDuration();
        ytplayer.ended = false;
      }
      if (event.data == YT.PlayerState.PAUSED)
        ytplayer.isPaused = true;
      if (event.data == YT.PlayerState.ENDED) {
        ytplayer.ended = true;
      }
      $rootScope.$apply();
    }
    function onYoutubeReady (event) {
      console.log('Youtube player ready');
    }
    $interval(function () {
      if (ytplayer.embedPlayer != null && !ytplayer.isPaused)
        ytplayer.currentTime = ytplayer.embedPlayer.getCurrentTime();
    },500);
    return ytplayer;
  }]);
