'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('MenuCtrl', function ($scope, $rootScope, $http, $location) {
    $http.get('/api/playlists').
      success(function(playlists){
        $scope.playlists = playlists;
      });

    $scope.$watch('search', function() {
      if ($scope.search != null)
        $location.path('/search/'+$scope.search);
    });

    $scope.$on('DeletedPlaylist', function(event, playlistId) {
      for (var i = 0; i < $scope.playlists.length; i++) {
        if ($scope.playlists[i].pid == playlistId) {
          $scope.playlists.splice(i, 1);
        }
      }
    });

    $scope.$on('RenamedPlaylist', function(event, playlist) {
      for (var i = 0; i < $scope.playlists.length; i++) {
        if ($scope.playlists[i].pid == playlist.pid) {
          $scope.playlists[i].title = playlist.title;
        }
      }
    });

    $scope.onDrop = function($event,$song,playlist){
      console.log($song);
      $http.post('/api/playlist/'+playlist.pid, $song).
        success(function(data) {
          $rootScope.$broadcast('UpdatedPlaylist', playlist.pid);
        });
    }
    $scope.newDrop = function($event,$song){
      $http.post('/api/playlist/'+$song.name, $song).
        success(function(data) {
          $scope.playlists.push({
            pid: $song.name.replace(' ','_').replace(/[^\w]/gi, ''),
            title: $song.name
          });
          $rootScope.$broadcast('NewPlaylist', playlist.pid);
        });
    }
  }).
  controller('SearchCtrl', function ($scope, $rootScope, $http, $routeParams) {
    var playlist = {
      title: 'Search results : '+$routeParams.query,
      songs: []
    }
    playlist.playPlaylist = function (index) {
      var message = {
        playlist: playlist,
        index: index
      }
      $rootScope.$broadcast('PlayPlaylist', message);
    }
    $scope.playlist = playlist;

    $http.get('/api/search/library/'+$routeParams.query).
        success(function(songs){
          for (var i = 0; i < songs.length; i++) {
            $scope.playlist.songs.push(songs[i]);
          }
        });
    $http.get('/api/search/soundcloud/'+$routeParams.query).
      success(function(songs){
        for (var i = 0; i < songs.length; i++) {
          $scope.playlist.songs.push(songs[i]);
        }
      });
    $http.get('/api/search/youtube/'+$routeParams.query).
      success(function(songs){
        for (var i = 0; i < songs.length; i++) {
          $scope.playlist.songs.push(songs[i]);
        }
      });
  }).
  controller('PlaylistCtrl', function ($scope, $rootScope, $http, $routeParams) {
    $http.get('/api/playlist/'+$routeParams.id).
      success(function(playlist) {
        playlist.playPlaylist = function (index) {
          var message = {
            playlist: playlist,
            index: index
          }
          $rootScope.$broadcast('PlayPlaylist', message);
        }
        playlist.deleteSong = function (songId) {
          $http.delete('/api/playlist/'+$routeParams.id+'/'+songId).
            success(function(data) {
              $rootScope.$broadcast('UpdatedPlaylist', $routeParams.id);
              playlist.songs.splice(songId, 1);
            });
        }
        playlist.moveDownSong = function (songId) {
          // equvalent to move up songId+1
          if (0 <= songId && songId < $scope.playlist.songs.length-1) {
            $http.get('api/playlist/'+$scope.playlist.pid+'/swap/'+songId).
              success(function(data) {
                $scope.playlist.songs = data;
                $rootScope.$broadcast('UpdatedPlaylist', $scope.playlist.pid);
              });
          }
        }
        playlist.delete = function () {
          $http.delete('/api/playlist/'+$scope.playlist.pid).
            success(function(data) {
              $rootScope.$broadcast('DeletedPlaylist', $scope.playlist.pid);
              $scope.playlist = null;
            });
        }
        playlist.renaming = function () {
          $scope.renaming = 1;
        }
        $scope.$watch('inputRename', function() {
          if ($scope.inputRename == null)
            return;
          $http.get('api/playlist/'+$scope.playlist.pid+'/rename/'+$scope.inputRename).
            success(function(data) {
              $scope.playlist.title = $scope.inputRename;
              $rootScope.$broadcast('RenamedPlaylist', $scope.playlist);
            });
        });
        $scope.$on('UpdatedPlaylist', function(event, playlistId) {
          if ($scope.playlist != null && $scope.playlist.pid == playlistId) {
            $http.get('/api/playlist/'+playlistId).
              success(function(playlist) {
                $scope.playlist.songs = playlist.songs;
              });
          }
        });

        $scope.playlist = playlist;
      });
  }).
  controller('AddToPlaylistCtrl', function ($scope, $rootScope, $http, $routeParams, $location) {
    $http.get('/api/playlist/'+$routeParams.id).
      success(function(playlist) {
        $scope.playlist = playlist;
      });

    $scope.form = {};
    $scope.addUrl = function () {
      $http.post('/api/playlist/addFromURL/'+$routeParams.id, $scope.form).
        success(function(data) {
          $rootScope.$broadcast('UpdatedPlaylist', $routeParams.id);
          $location.path('/pl/'+$routeParams.id);
        });
    };
  }).
  controller('PlayerCtrl', function ($scope, $http, $window, htmlplayer, ytplayer, scplayer) {
    ytplayer.insertScript();
    $scope.mode = 'repeat';
    $scope.volume = 100;
    $scope.$on('PlayPlaylist', function(event, message) {
      $scope.playlist = message.playlist;
      $scope.currentSong == message.index ? playSong() : $scope.currentSong = message.index;
      $scope.isPaused = false;
      $scope.btnPlayText = 'Pause';
    });

    $scope.$on('UpdatedPlaylist', function(event, playlistId) {
      if ($scope.playlist != null && $scope.playlist.pid == playlistId) {
        $http.get('/api/playlist/'+playlistId).
          success(function(playlist) {
            $scope.playlist = playlist;
          });
      }
    });
    $scope.$on('RenamedPlaylist', function(event, playlist) {
      if ($scope.playlist.pid == playlist.pid) {
        $scope.playlist.title = playlist.title;
      }
    });

    // User Controls
    $scope.next = function() {
      switch ($scope.mode) {
      case 'repeat':
        $scope.currentSong++;
        if ($scope.currentSong == $scope.playlist.songs.length)
          $scope.currentSong = 0;
        if ($scope.playlist.songs.length == 1)
          playSong();
        break;
      case 'repeatone':
        playSong();
        break;
      case 'random':
        $scope.currentSong = Math.floor(Math.random()*$scope.playlist.songs.length);
        break;
      default:
      }
    };
    $scope.prev = function() {
      switch ($scope.mode) {
      case 'repeat':
        $scope.currentSong--;
        if ($scope.currentSong == -1)
          $scope.currentSong += $scope.playlist.songs.length;
        if ($scope.playlist.songs.length == 1)
          playSong();
        break;
      case 'repeatone':
        playSong();
        break;
      case 'random':
        $scope.currentSong = $scope.previousSong;
        break;
      default:
      }
    };
    $scope.getCurrentSong = function() {
      if ($scope.playlist == null)
        return false;

      var songIndex = $scope.currentSong % $scope.playlist.songs.length;
      while (songIndex<0)
        songIndex += $scope.playlist.songs.length;
      return $scope.playlist.songs[songIndex];
    };
    $scope.changeTime = function($event) {
      var position = $event.offsetX;
      var maximum= $event.srcElement.offsetWidth;
      if ($event.srcElement.classList[0] != 'progress')
        maximum = $event.srcElement.parentNode.offsetWidth;

      $scope.currentTime = $scope.maxTime*position/maximum;
    };
    $scope.$watch('videoWidth', function() {
      if ($scope.videoWidth != null && ytplayer.embedPlayer != null) {
        var videoHeight = $scope.videoWidth*9/16;
        ytplayer.embedPlayer.setSize($scope.videoWidth, videoHeight);
      }
    });
    $scope.$watch('currentSong', function(newSongIndex, oldSongIndex) {
      $scope.previousSong = (oldSongIndex != null ? oldSongIndex : newSongIndex);
      playSong();
    });
    $scope.$watch('isPaused', function() {
      if ($scope.isPaused) {
        pauseSong();
        $scope.btnPlayText = 'Play';
      } else {
        resumeSong();
        $scope.btnPlayText = 'Pause';
      }
    });
    $scope.$watch('volume', function() {
      setVolume($scope.volume);
    });
    $scope.$watch('currentTime', function(curtime, oldtime) {
      if (Math.abs(curtime-oldtime) > 2 && (curtime==0 || curtime>=1)) {
        console.log('Time jump from '+oldtime+' to '+curtime);
        setSongTime(curtime);
      }
    });
    $scope.$watch(function () {
      return getFormattedTime($scope.currentTime, $scope.maxTime);
    }, function(newtime) {
      $scope.displayTime = newtime;
    });

    // HTML AUDIO Controls
    $scope.$watch(function () {
      return htmlplayer.audioElement.ended;
    }, function(ended) {
      if (ended)
        $scope.next();
    });
    $scope.$watch(function () {
      return htmlplayer.audioElement.duration;
    }, function(duration) {
      setSongDuration();
    });
    $scope.$watch(function () {
      return htmlplayer.audioElement.currentTime;
    }, function(curtime, oldtime) {
      if ($scope.getCurrentSong().type == 'library' || $scope.getCurrentSong().type == 'external')
        $scope.currentTime = curtime;
    });

    // Youtube Controls
    $scope.$watch(function () {
      return ytplayer.ended;
    }, function(ended) {
      if (ended)
        $scope.next();
    });
    $scope.$watch(function () {
      return ytplayer.duration;
    }, function(newMaxTime) {
      setSongDuration();
    });
    $scope.$watch(function () {
      return ytplayer.currentTime;
    }, function(curtime, oldtime) {
      if ($scope.getCurrentSong().type == 'youtube')
        $scope.currentTime = curtime;
    });

    // Soundcloud Controls
    $scope.$watch(function () {
      return scplayer.ended;
    }, function(ended) {
      if (ended)
        $scope.next();
    });
    $scope.$watch(function () {
      return scplayer.duration;
    }, function(newMaxTime) {
      setSongDuration();
    });
    $scope.$watch(function () {
      return scplayer.currentTime;
    }, function(curtime, oldtime) {
      if ($scope.getCurrentSong().type == 'soundcloud')
        $scope.currentTime = curtime;
    });

    function pauseSong() {
      switch ($scope.getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.pauseVideo();
        break;
      case 'soundcloud':
        scplayer.embedPlayer.pause();
        break;
      case 'library':
      case 'external':
        htmlplayer.pause();
        break;
      default:
      }
    }

    function resumeSong() {
      switch ($scope.getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.playVideo();
        break;
      case 'soundcloud':
        scplayer.embedPlayer.play();
        break;
      case 'library':
      case 'external':
        htmlplayer.play();
        break;
      default:
      }
    }

    function playSong() {
      if ($scope.playlist != undefined) {
        stopAllPlayers();
        switch ($scope.getCurrentSong().type) {
        case 'youtube':
          ytplayer.loadVideoById($scope.getCurrentSong().videoId);
          break;
        case 'soundcloud':
          scplayer.playUrl($scope.getCurrentSong().url);
          break;
        case 'library':
          htmlplayer.loadAndPlay('/library/' + $scope.getCurrentSong().path);
          $scope.maxTime = Math.round(htmlplayer.audioElement.duration);
          break;
        case 'external':
          htmlplayer.loadAndPlay($scope.getCurrentSong().url);
          $scope.maxTime = Math.round(htmlplayer.audioElement.duration);
          break;
        default:
        }
        $scope.currentSongName = $scope.getCurrentSong().name;
        $window.document.title = $scope.currentSongName;
        $scope.isPaused = false;
      }
    }

    function stopAllPlayers() {
      if (ytplayer.embedPlayer != undefined) {
        ytplayer.embedPlayer.pauseVideo();
        ytplayer.embedPlayer.stopVideo();
      }
      if (scplayer.embedPlayer != undefined) {
        scplayer.embedPlayer.pause();
      }
      if (htmlplayer.audioElement != undefined) {
        htmlplayer.pause();
      }
    }

    function setSongDuration() {
      switch ($scope.getCurrentSong().type) {
      case 'youtube':
        $scope.maxTime = Math.round(ytplayer.getDuration());
        break;
      case 'soundcloud':
        $scope.maxTime = Math.round(scplayer.duration);
        break;
      case 'library':
      case 'external':
        $scope.maxTime = Math.round(htmlplayer.audioElement.duration);
        break;
      default:
      }
    }

    function setVolume(volume) {
      ytplayer.setVolume(volume);
      htmlplayer.setVolume(volume);
      scplayer.setVolume(volume)
    }

    function setSongTime(currentTime) {
      switch ($scope.getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.seekTo(currentTime);
        break;
      case 'soundcloud':
        scplayer.embedPlayer.seekTo(currentTime*1000);
        break;
      case 'library':
      case 'external':
        htmlplayer.setTime(currentTime);
        break;
      default:
      }
    }

    function getFormattedTime(current, max) {
      var times = [];
      times.push(current%60);
      times.push((current-times[0])/60);
      times.push(max%60);
      times.push((max-times[2])/60);
      for (var i = 0; i < times.length; i++) {
        times[i] = Math.round(times[i]);
        if (times[i]<10) times[i] = '0' + times[i];
      }
      return times[1] + ':' + times[0] + '/' + times[3] + ':' + times[2];
    }
  });
