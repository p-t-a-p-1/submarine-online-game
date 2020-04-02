'use strict'
import $ from 'jquery'
import io from 'socket.io-client'

// ゲームで使用するパラメータをオブジェクトにする
const gameObj = {
  raderCanvasWidth: 500,
  raderCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  itemRadius: 4, // ミサイルアイテムの大きさ（円なので半径radius）
  airRadius: 5, // 酸素アイテムの大きさ（円なので半径radius）
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl'),
  fieldWidth: null,
  fieldHeight: null,
  itemsMap: new Map(),
  airMap: new Map()
}

// WebSocketを開始するクライアントのTwitterアカウント名とサムネをパラメータとして結合
const socketQueryParameters = `displayName=${gameObj.myDisplayName}&thumbUrl=${gameObj.myThumbUrl}`
// サーバーのIPアドレスに対してWebSocket通信を開始するリクエストを送信
const socket = io(
  $('#main').attr('data-ipAddress') + '?' + socketQueryParameters
)

/**
 * 最初に実行する関数（ゲーム準備）
 */
function init() {
  // ゲーム用のキャンバス
  const raderCanvas = $('#rader')[0]
  raderCanvas.width = gameObj.raderCanvasWidth
  raderCanvas.height = gameObj.raderCanvasHeight
  // canvasへの描画機能を有効化
  gameObj.ctxRader = raderCanvas.getContext('2d')

  // ランキング用のキャンバス
  const scoreCanvas = $('#score')[0]
  scoreCanvas.width = gameObj.scoreCanvasWidth
  scoreCanvas.height = gameObj.scoreCanvasHeight
  // canvasへの描画機能を有効化
  gameObj.ctxScore = scoreCanvas.getContext('2d')

  // 潜水艦の画像
  const submarineImage = new Image()
  submarineImage.src = '/images/submarine.png'
  gameObj.submarineImage = submarineImage
}
init()

/**
 * 時計の針のようにゲームの時を刻む
 */
function ticker() {
  // canvas（#rader）の中身をまっさらにする
  gameObj.ctxRader.clearRect(
    0,
    0,
    gameObj.raderCanvasWidth,
    gameObj.raderCanvasHeight
  )
  // レーダーを描画
  drawRader(gameObj.ctxRader)
  // 潜水艦を描画
  drawSubmarine(gameObj.ctxRader)
}
// 33ミリ秒ごとに実行
setInterval(ticker, 33)

/**
 * レーダーの描画処理
 * ※レーダーは半透明の緑色の扇を回転するようにして表現
 * @param {object} ctxRader レーダーの現在の状況
 */
function drawRader(ctxRader) {
  // 中心座標のx軸
  const x = gameObj.raderCanvasWidth / 2
  // 中心座標のy軸
  const y = gameObj.raderCanvasHeight / 2
  // 半径 = 対角線の長さの半分とする
  const r = (gameObj.raderCanvasWidth * 1.5) / 2

  // 現在のキャンバスの状態をセーブ
  ctxRader.save()

  // 新しいレーダー描画開始
  ctxRader.beginPath()
  // レーダー画面の中央を(x, y)座標にする
  ctxRader.translate(x, y)
  // レーダーの座標をgameObj.deg度回転させる
  ctxRader.rotate(getRadian(gameObj.deg))

  // 描画するレーダーを半透明の緑色に設定
  ctxRader.fillStyle = 'rgba(0, 220, 0, 0.5)'

  /**
   * 扇の弧の部分を原点(0, 0)を中心にして半径rで30度分描画する
   * → 上で原点を(x, y)にしてるので、canvasの中心から半径rの円弧を30度だけ描画することになる
   */
  ctxRader.arc(0, 0, r, getRadian(0), getRadian(-30), true)
  // 円弧を描いた筆で中心に向かって線を描画
  ctxRader.lineTo(0, 0)

  // 描画したエリアを塗りつぶす
  ctxRader.fill()

  // 描画状態を保存した時点のものに戻す
  ctxRader.restore()
  // 角度を5度足す
  gameObj.deg = (gameObj.deg + 5) % 360
}

/**
 * 潜水艦の画像を表示する
 * @param {object} ctxRader レーダーの現在の状況
 */
function drawSubmarine(ctxRader) {
  // canvasの状態を保存
  ctxRader.save()

  // 座標をcanvasの中心に設定
  ctxRader.translate(
    gameObj.raderCanvasWidth / 2,
    gameObj.raderCanvasHeight / 2
  )

  // 潜水艦画像の表示
  ctxRader.drawImage(
    gameObj.submarineImage, // 画像ファイル
    -(gameObj.submarineImage.width / 2), // x軸の表示位置（画像widthの半分の長さ分マイナス）
    -(gameObj.submarineImage.height / 2) // y軸の表示位置（画像heightの半分の長さ分マイナス）
  )

  // 描画状態を保存した時点のものに戻す
  ctxRader.restore()
}

/**
 * WebSocketデータを受信した時の処理
 * socket.on('イベント', () => { 処理 })
 */
socket.on('start data', startObj => {
  // start dataという名前のイベントが来た時に実行される

  /**
   * ゲームに参加した時にゲームの設定を受け取る
   */
  gameObj.fieldWidth = startObj.fieldWidth
  gameObj.fieldHeight = startObj.fieldHeight
  gameObj.myPlayerObj = startObj.playerObj
})

socket.on('map data', compressed => {
  // map dataという名前のイベントが来た時に実行される
  // 66ミリ秒ごとにデータが送られてくる

  /**
   * マップ情報を受け取る
   */
  // game.getMapData()でそれぞれ定義した値を参照
  const playersArray = compressed[0]
  const itemsArray = compressed[1]
  const airArray = compressed[2]

  gameObj.playersMap = new Map()
  /**
   * データの節約のためにオブジェクトではなく値だけを入れた配列を
   * サーバーで送った通りgameObjに追加する
   */
  for (let compressedPlayerData of playersArray) {
    const player = []
    player.x = compressedPlayerData[0]
    player.y = compressedPlayerData[1]
    player.playerId = compressedPlayerData[2]
    player.displayName = compressedPlayerData[3]
    player.score = compressedPlayerData[4]
    player.isAlive = compressedPlayerData[5]
    player.direction = compressedPlayerData[6]

    gameObj.playersMap.set(player.playerId, player)

    if (player.playerId === gameObj.myPlayerObj.playerId) {
      /**
       * 自分自身の情報を更新する
       */
      gameObj.myPlayerObj.x = compressedPlayerData[0]
      gameObj.myPlayerObj.y = compressedPlayerData[1]
      gameObj.myPlayerObj.displayName = compressedPlayerData[3]
      gameObj.myPlayerObj.score = compressedPlayerData[4]
      gameObj.myPlayerObj.isAlive = compressedPlayerData[5]
    }
  }

  /**
   * ミサイルアイテムも値だけを入れた配列としていたので
   * サーバーで送った通りgameObjに追加
   */
  gameObj.itemsMap = new Map()
  itemsArray.forEach((compressedItemData, index) => {
    // 座標情報
    gameObj.itemsMap.set(index, {
      x: compressedItemData[0],
      y: compressedItemData[1]
    })
  })

  gameObj.airMap = new Map()
  airArray.forEach((compressedAirData, index) => {
    gameObj.airMap.set(index, {
      x: compressedAirData[0],
      y: compressedAirData[1]
    })
  })

  console.log(gameObj.playersMap)
  console.log(gameObj.itemsMap)
  console.log(gameObj.airMap)
})

/**
 * 角度をラジアンに変換する
 * @param {int} kakudo 角度
 */
function getRadian(kakudo) {
  // radian = 角度 * π / 180
  return (kakudo * Math.PI) / 180
}
