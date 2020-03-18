/**
 * game本体の動作
 */
var express = require('express')
var router = express.Router()
var config = require('../config')

router.get('/', function(req, res, next) {
  let displayName = 'anonymous'
  let thumbUrl = 'anonymous'
  if (req.user) {
    // ユーザー情報がある場合はTwitterアカウントの情報で上書き
    displayName = req.user.displayName
    thumbUrl = req.user.photos[0].value
  }
  res.render('game', {
    title: '潜水艦ゲーム',
    displayName: displayName,
    thumbUrl: thumbUrl,
    ipAddress: config.ipAddress // ipアドレス WebSocket利用するため
  })
})

module.exports = router
