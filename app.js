
/**
 * Module dependencies
 */

var express = require('express'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  errorHandler = require('express-error-handler'),
  morgan = require('morgan'),
  routes = require('./routes'),
  api = require('./routes/api'),
  http = require('http'),
  path = require('path'),
  readdirp = require('readdirp')

var app = module.exports = express();


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 12321);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

var env = process.env.NODE_ENV || 'development';

// development only
if (env === 'development') {
  app.use(errorHandler());
}

// production only
if (env === 'production') {
  // TODO
}


/**
 * Routes
 */

// serve index and view partials
app.get('/:id', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/playlists', api.playlists);
app.get('/api/playlist/:id', api.playlist);
app.delete('/api/playlist/:id', api.deletePlaylist);
app.post('/api/playlist/:id', api.addSongToPlaylist);
app.get('/api/playlist/:id/swap/:songId', api.swap);
app.get('/api/playlist/:id/rename/:title', api.renamePlaylist);
app.delete('/api/playlist/:id/:songid', api.deleteSongFromPlaylist);
app.post('/api/playlist/addFromURL/:id', api.addSongToPlaylistFromURL);

app.get('/api/search/library/:query', api.searchLibrary);
app.get('/api/search/soundcloud/:query', api.searchSoundcloud);
app.get('/api/search/youtube/:query', api.searchYoutube);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);



/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
