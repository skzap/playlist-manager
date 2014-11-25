'use strict';

// Declare app level module which depends on filters, and services

angular.module('myApp', [
  'ngRoute',
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ang-drag-drop'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/pl/:id', {
      templateUrl: 'partials/playlist',
      controller: 'PlaylistCtrl'
    }).
    when('/pl/:id/add', {
      templateUrl: 'partials/addToPlaylist',
      controller: 'AddToPlaylistCtrl'
    }).
    when('/search/:query', {
      templateUrl: 'partials/search',
      controller: 'SearchCtrl'
    }).
    otherwise({
      redirectTo: '/pl/skzap'
    });

  $locationProvider.html5Mode(true);
});

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};
