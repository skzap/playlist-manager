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
  factory('scplayer', ['$document', '$rootScope', function ($document, $rootScope) {
    var scplayer = {
      embedPlayer: null,
      isLoaded: false,
      isPaused: true,
      duration: 0,
      currentTime: 0,
      ended: false,
      volume: 0,
      playUrl: function(scurl) {
        console.log(this.isLoaded);
        if (this.isLoaded) {
          var options = {auto_play: true, buying: false};
          this.embedPlayer.load(scurl, options);
        }
        else {
          this.loadPlayer(scurl);
        }
        this.currentTime = 0;
      },
      loadPlayer: function (scurl) {
        var iframe = document.querySelector('#scplayer');
        iframe.src = 'https://w.soundcloud.com/player/?buying=false&auto_play=true&url='+scurl;
        this.embedPlayer = SC.Widget(iframe);
        this.embedPlayer.bind(SC.Widget.Events.READY, function() {
          scplayer.embedPlayer.bind(SC.Widget.Events.PLAY, function() {
            scplayer.isPaused = false;
            scplayer.embedPlayer.getDuration(function(milliseconds) {
              scplayer.duration = milliseconds/1000;
            });
            scplayer.ended = false;
          });
          scplayer.embedPlayer.bind(SC.Widget.Events.PAUSE, function() {
            scplayer.isPaused = true;
          });
          scplayer.embedPlayer.bind(SC.Widget.Events.FINISH, function() {
            scplayer.ended = true;
          });
          scplayer.embedPlayer.bind(SC.Widget.Events.PLAY_PROGRESS, function(object) {
            scplayer.currentTime = object.currentPosition/1000;
            scplayer.setVolume(scplayer.volume);
          });
        });
        this.isLoaded = true;
        console.log('Soundcloud Player Loaded');
      },
      setVolume: function(volume) {
        this.volume = volume;
        if (this.isLoaded)
          this.embedPlayer.setVolume(volume/100);
      }
    };
    return scplayer;
  }]).
  factory('ytplayer', ['$window', '$rootScope', '$interval', function ($window, $rootScope, $interval) {
    var ytplayer = {
      embedPlayer: null,
      isReady: false,
      isPaused: true,
      isLoaded: false,
      duration: 0,
      currentTime: 0,
      ended: false,
      loadPlayer: function (id) {
        this.embedPlayer = new YT.Player('ytplayer', {
          videoId: id,
          width: 355,
          height: 200,
          events: {
            'onReady': onYoutubeReady,
            'onStateChange': onYoutubeStateChange
          },
          playerVars: {
            controls: 0,
            iv_load_policy: 3,
            rel: 0,
            showinfo: 0
          }
        });
      },
      loadVideoById: function(id) {
        if (this.isLoaded)
          this.embedPlayer.loadVideoById({
            videoId: id
          });
        else
          this.loadPlayer(id);
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
      ytplayer.loadPlayer(null);
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
      ytplayer.isLoaded = true;
      console.log('Youtube player ready');
    }
    $interval(function () {
      if (ytplayer.embedPlayer != null && !ytplayer.isPaused)
        ytplayer.currentTime = ytplayer.embedPlayer.getCurrentTime();
    },500);
    return ytplayer;
  }]);
