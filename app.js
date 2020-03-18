var dotenv = require('dotenv')
dotenv.config()
var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var helmet = require('helmet')
var session = require('express-session')
var passport = require('passport')
var Strategy = require('passport-twitter').Strategy
var config = require('./config')

var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')

/**
 * Twitterを利用した認証の戦略オブジェクトを設定
 */
passport.use(
  new Strategy(
    {
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
      callbackURL: config.twitter.callbackURL
    },
    function(token, tokenSecret, profile, cb) {
      process.nextTick(function() {
        return cb(null, profile)
      })
    }
  )
)

// ユーザーの情報をデータとして保存
passport.serializeUser(function(user, cb) {
  cb(null, user)
})

// 保存されたデータをユーザーの情報として呼び出す
passport.deserializeUser(function(obj, cb) {
  cb(null, obj)
})

var app = express()
app.use(helmet())

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

/**
 * express-sessionとpassportでセッションの利用
 */
// セッションのオプション
app.use(
  session({
    secret: process.env.SESSION_SECRET, // セッションIDを利用する際の秘密鍵の文字列
    resave: false, // セッションをストアに保存させない
    saveUninitialized: false // セッションが初期化されていなくても保存しない
  })
)
app.use(passport.initialize())
app.use(passport.session())

app.use('/', indexRouter)
app.use('/users', usersRouter)

// Twitterに対して認証処理
app.get('/login/twitter', passport.authenticate('twitter'))

// Twitter認証のコールバック関数
app.get(
  '/oauth_callback', // Twitterが利用者の許可に対する問い合わせの結果を送るパス
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    // 認証成功時の処理
    res.redirect('/')
  }
)

// Twitter認証・ログアウト処理
app.get('/logout', function(req, res) {
  req.logout()
  res.redirect('/')
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/')
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
