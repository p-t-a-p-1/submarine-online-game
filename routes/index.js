var express = require('express')
var router = express.Router()

/* GET home page. */
router.get('/', function(req, res, next) {
  // ユーザーがTwitter認証を完了するとTwitterのアカウント情報がreq.userに入る
  res.render('index', { title: '潜水艦ゲーム', user: req.user })
})

module.exports = router
