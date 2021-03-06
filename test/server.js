var needle = require('needle')
var http = require('http')
var Router = require('..')

var mkdirp = require('mkdirp')
var path = require('path')
var rimraf = require('rimraf')
var osmdb = require('kappa-osm')
var kappa = require('kappa-core')
var raf = require('random-access-file')
var level = require('level')
var blobstore = require('safe-fs-blob-store')
var tmp = require('tmp')

module.exports = {
  join,
  leave,
  destroy,
  listen,
  twoServers,
  createServer
}

function createServer (opts, cb) {
  if (!cb) {
    cb = opts
    opts = { port: 5000 }
  }
  var base = `http://localhost:${opts.port}`
  var dir = tmp.dirSync().name

  rimraf.sync(dir)
  mkdirp.sync(dir)

  var osm = osmdb({
    core: kappa(dir, { valueEncoding: 'json' }),
    index: level(path.join(dir, 'index')),
    storage: function (name, cb) {
      process.nextTick(cb, null, raf(path.join(dir, 'storage', name)))
    }
  })
  var media = blobstore(path.join(dir, 'media'))

  var router = Router(osm, media, opts)

  var server = http.createServer(function (req, res) {
    if (router.handle(req, res)) {
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.on('close', function () {
    router.api.close()
  })
  server.listen(opts.port, function () {
    cb(server, base, osm, media, router)
  })
}

function twoServers (opts, cb) {
  if (!cb) {
    cb = opts
    opts = { a: {}, b: {} }
  }
  createServer(Object.assign({
    port: 5000,
    media: opts.a.media
  }, opts.a.opts || {}), function (server, base, osm, media, router) {
    const a = { server, base, osm, media, router }
    createServer(Object.assign({
      port: 5001,
      media: opts.b.media
    }, opts.b.opts || {}), function (server2, base2, osm2, media2, router2) {
      const b = {
        server: server2,
        base: base2,
        osm: osm2,
        media: media2,
        router: router2
      }
      cb(a, b)
    })
  })
}

function listen (a, b, cb) {
  needle.get(a.base + '/sync/listen', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/listen', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}

function destroy (a, b, cb) {
  needle.get(a.base + '/sync/destroy', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/destroy', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}

function join (a, b, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  var nameA = a._name || 'a'
  var nameB = b._name || 'b'

  var urlA = a.base + '/sync/join?name=' + nameA
  if (opts.a && opts.a.projectKey) urlA += '&project_key=' + opts.a.projectKey
  var urlB = b.base + '/sync/join?name=' + nameB
  if (opts.b && opts.b.projectKey) urlB += '&project_key=' + opts.b.projectKey

  needle.get(urlA, function (err, resp, body) {
    if (err) return cb(err)
    needle.get(urlB, function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}

function leave (a, b, cb) {
  needle.get(a.base + '/sync/leave', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/leave', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}
