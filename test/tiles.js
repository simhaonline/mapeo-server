var test = require('tape')
var hyperquest = require('hyperquest')
var createServer = require('./server')
var concat = require('concat-stream')

test('tiles: list', function (t) {
  createServer(function (server, base) {
    var href = base + '/tiles'

    var hq = hyperquest.get(href, {})

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      try {
        var obj = JSON.parse(body)
        var expected = [
          { id: 'mapbox.satellite',
            name: 'Mapbox Satellite',
            description: '',
            bounds: [ -122.339973, 37.742214, -122.150116, 37.856694 ],
            minzoom: 0, maxzoom: 22
          },
          { id: 'mapbox.mapbox-streets-v7',
            name: 'Mapbox Streets v7',
            description: '',
            bounds: [ -122.339973, 37.742214, -122.150116, 37.856694 ],
            minzoom: 0, maxzoom: 16
          }
        ]
        t.deepEquals(obj, expected)
      } catch (e) {
        t.error(e, 'json parsing exception!')
      }
      server.close()
      t.end()
    }))
  })
})

test('tiles: get', function (t) {
  createServer(function (server, base) {
    var href = base + '/tiles/sat-style/tiles/mapbox.satellite/6/10/24.png'
    var hq = hyperquest.get(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'get 200 ok')
      t.equal(res.headers['content-type'], 'image/png', 'type correct')

      hq.pipe(concat(function (body) {
        t.equals(body.length, 21014, 'correct file length')
        server.close()
        t.end()
      }))
    })
    hq.once('error', function (err) {
      t.error(err, 'no http error')
    })
  })
})