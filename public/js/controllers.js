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

    $scope.onDrop = function($event,$data,playlist){
      $http.post('/api/playlist/'+playlist.pid, $data).
        success(function(data) {
          $rootScope.$broadcast('UpdatedPlaylist', playlist.pid);
        });
    }
  }).
  controller('SearchCtrl', function ($scope, $rootScope, $http, $routeParams) {
    $http.get('/api/search/'+$routeParams.query).
      success(function(playlist){
        playlist.playPlaylist = function (index) {
          var message = {
            playlist: playlist,
            index: index
          }
          $rootScope.$broadcast('PlayPlaylist', message);
        }
        $scope.playlist = playlist;
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
        $scope.$on('UpdatedPlaylist', function(event, playlistId) {
          if ($scope.playlist != null && $scope.playlist.pid == playlistId) {
            $http.get('/api/playlist/'+playlistId).
              success(function(playlist) {
                $scope.playlist.songs = playlist.songs;
              });
          }
        });
        $scope.onDrop = function($event,$data,song){
          console.log($data);
          console.log(song);
          console.log($scope.playlist.songs);
        }


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
  controller('PlayerCtrl', function ($scope, $http, $window, htmlplayer, ytplayer, torrentclient) {
    ytplayer.insertScript();
    $scope.mode = 'repeat';
    $scope.volume = 100;
    $scope.$on('PlayPlaylist', function(event, message) {
      //torrentclient.testDownload();
      $scope.playlist = message.playlist;
      $scope.currentSong == message.index ? playSong() : $scope.currentSong = message.index;
      $scope.isPaused = false;
      $scope.btnPlayText = 'Pause';
    });

    // $scope.$on('UpdatedPlaylist', function(event, playlistId) {
    //   if ($scope.playlist != null && $scope.playlist.pid == playlistId) {
    //     $http.get('/api/playlist/'+playlistId).
    //       success(function(playlist) {
    //         $scope.playlist = playlist;
    //       });
    //   }
    // });

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
      default:
      }
    };
    $scope.$watch('currentSong', function() {
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
      if (Math.abs(curtime-oldtime) > 2)
        setSongTime(curtime);
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
      $scope.maxTime = newMaxTime;
    });
    $scope.$watch(function () {
      return ytplayer.currentTime;
    }, function(curtime, oldtime) {
      $scope.currentTime = curtime;
    });

    function pauseSong() {
      switch (getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.pauseVideo();
        break;
      case 'library':
      case 'external':
        htmlplayer.pause();
        break;
      default:
      }
    }

    function resumeSong() {
      switch (getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.playVideo();
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
        switch (getCurrentSong().type) {
        case 'youtube':
          ytplayer.loadVideoById(getCurrentSong().videoId);
          break;
        case 'library':
          htmlplayer.loadAndPlay('/library/' + getCurrentSong().path);
          $scope.maxTime = Math.round(htmlplayer.audioElement.duration);
          break;
        case 'external':
          htmlplayer.loadAndPlay(getCurrentSong().url);
          $scope.maxTime = Math.round(htmlplayer.audioElement.duration);
          break;
        default:
        }
        $scope.currentSongName = getCurrentSong().name;
        $window.document.title = $scope.currentSongName;
        $scope.isPaused = false;
      }
    }

    function stopAllPlayers() {
      if (ytplayer.embedPlayer != undefined) {
        ytplayer.embedPlayer.pauseVideo();
        ytplayer.embedPlayer.stopVideo();
      }
      if (htmlplayer.audioElement != undefined) {
        htmlplayer.pause();
      }
    }

    function getCurrentSong() {
      if ($scope.playlist == null)
        return false;

      var songIndex = $scope.currentSong % $scope.playlist.songs.length;
      while (songIndex<0)
        songIndex += $scope.playlist.songs.length;
      return $scope.playlist.songs[songIndex];
    }

    function setSongDuration() {
      switch (getCurrentSong().type) {
      case 'youtube':
        $scope.maxTime = Math.round(ytplayer.getDuration());
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
    }

    function setSongTime(currentTime) {
      switch (getCurrentSong().type) {
      case 'youtube':
        ytplayer.embedPlayer.seekTo(currentTime);
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