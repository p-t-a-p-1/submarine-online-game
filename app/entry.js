'use strict'
import $ from 'jquery'
import io from 'socket.io-client'

// ゲームで使用するパラメータをオブジェクトにする
const gameObj = {
  radarCanvasWidth: 500,
  radarCanvasHeight: 500,
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
  const radarCanvas = $('#radar')[0]
  radarCanvas.width = gameObj.radarCanvasWidth
  radarCanvas.height = gameObj.radarCanvasHeight
  // canvasへの描画機能を有効化
  gameObj.ctxRadar = radarCanvas.getContext('2d')

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

// サーバーでプレイヤーを移動させる処理を33ミリ秒ごとに実行させる
const gameTicker = setInterval(() => {
  // 潜水艦の移動
  movePlayers(gameObj.playersMap)
}, 33)

/**
 * 時計の針のようにゲームの時を刻む
 */
function ticker() {
  if (!gameObj.myPlayerObj || !gameObj.playersMap) {
    // サーバーからデータを受け取っていない場合はマップを描画しない
    return
  }

  // canvas（#radar）の中身をまっさらにする
  gameObj.ctxRadar.clearRect(
    0,
    0,
    gameObj.radarCanvasWidth,
    gameObj.radarCanvasHeight
  )
  // レーダーを描画
  drawRadar(gameObj.ctxRadar)
  // マップを描画
  drawMap(gameObj)
  // 潜水艦を描画
  drawSubmarine(gameObj.ctxRadar)
}
// 33ミリ秒ごとに実行
setInterval(ticker, 33)

/**
 * レーダーの描画処理
 * ※レーダーは半透明の緑色の扇を回転するようにして表現
 * @param {object} ctxRadar レーダーの現在の状況
 */
function drawRadar(ctxRadar) {
  // 中心座標のx軸
  const x = gameObj.radarCanvasWidth / 2
  // 中心座標のy軸
  const y = gameObj.radarCanvasHeight / 2
  // 半径 = 対角線の長さの半分とする
  const r = (gameObj.radarCanvasWidth * 1.5) / 2

  // 現在のキャンバスの状態をセーブ
  ctxRadar.save()

  // 新しいレーダー描画開始
  ctxRadar.beginPath()
  // レーダー画面の中央を(x, y)座標にする
  ctxRadar.translate(x, y)
  // レーダーの座標をgameObj.deg度回転させる
  ctxRadar.rotate(getRadian(gameObj.deg))

  // 描画するレーダーを半透明の緑色に設定
  ctxRadar.fillStyle = 'rgba(0, 220, 0, 0.5)'

  /**
   * 扇の弧の部分を原点(0, 0)を中心にして半径rで30度分描画する
   * → 上で原点を(x, y)にしてるので、canvasの中心から半径rの円弧を30度だけ描画することになる
   */
  ctxRadar.arc(0, 0, r, getRadian(0), getRadian(-30), true)
  // 円弧を描いた筆で中心に向かって線を描画
  ctxRadar.lineTo(0, 0)

  // 描画したエリアを塗りつぶす
  ctxRadar.fill()

  // 描画状態を保存した時点のものに戻す
  ctxRadar.restore()
  // 角度を5度足す
  gameObj.deg = (gameObj.deg + 5) % 360
}

/**
 * 潜水艦の画像を表示する
 * @param {object} ctxRadar レーダーの現在の状況
 */
function drawSubmarine(ctxRadar) {
  // canvasの状態を保存
  ctxRadar.save()

  // 座標をcanvasの中心に設定
  ctxRadar.translate(
    gameObj.radarCanvasWidth / 2,
    gameObj.radarCanvasHeight / 2
  )

  // 潜水艦画像の表示
  ctxRadar.drawImage(
    gameObj.submarineImage, // 画像ファイル
    -(gameObj.submarineImage.width / 2), // x軸の表示位置（画像widthの半分の長さ分マイナス）
    -(gameObj.submarineImage.height / 2) // y軸の表示位置（画像heightの半分の長さ分マイナス）
  )

  // 描画状態を保存した時点のものに戻す
  ctxRadar.restore()
}

/**
 * マップの描画
 * @param {Object} gameObj
 */
function drawMap(gameObj) {
  /**
   * アイテムの描画
   * レーダー近い場合はくっきりと描画、遠い場合は透明度をあげてうっすらとさせる
   */
  for (let [index, item] of gameObj.itemsMap) {
    // アイテムの個数分ループ

    // ２つの物の距離を計算
    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x,
      gameObj.myPlayerObj.y,
      item.x,
      item.y,
      gameObj.fieldWidth,
      gameObj.fieldHeight,
      gameObj.radarCanvasWidth,
      gameObj.radarCanvasHeight
    )

    if (
      distanceObj.distanceX <= gameObj.radarCanvasWidth / 2 &&
      distanceObj.distanceY <= gameObj.radarCanvasHeight / 2
    ) {
      /**
       * レーダーの半径内に存在するアイテムのみ描画
       */

      // アイテムとレーダーの角度の差を計算
      const degreeDiff = calcDegreeDiffFromRadar(
        gameObj.deg,
        distanceObj.degree
      )
      // 透明度
      const toumeido = calcOpacity(degreeDiff)

      // オレンジ（透明度は潜水艦からの距離によって変わる）
      gameObj.ctxRadar.fillStyle = `rgba(255, 165, 0, ${toumeido})`
      // 描画処理開始
      gameObj.ctxRadar.beginPath()
      /**
       * 半径がgameObj.itemRadiusの円を描画
       */
      gameObj.ctxRadar.arc(
        distanceObj.drawX,
        distanceObj.drawY,
        gameObj.itemRadius,
        0,
        Math.PI * 2,
        true
      )
      // 描画範囲塗りつぶす
      gameObj.ctxRadar.fill()
    }
  }

  /**
   * 酸素の描画（↑の処理と同じ）
   */
  for (let [airKey, airObj] of gameObj.airMap) {
    // 酸素の数だけループ

    const distanceObj = calculationBetweenTwoPoints(
      gameObj.myPlayerObj.x,
      gameObj.myPlayerObj.y,
      airObj.x,
      airObj.y,
      gameObj.fieldWidth,
      gameObj.fieldHeight,
      gameObj.radarCanvasWidth,
      gameObj.radarCanvasHeight
    )

    if (
      distanceObj.distanceX <= gameObj.radarCanvasWidth / 2 &&
      distanceObj.distanceY <= gameObj.radarCanvasHeight / 2
    ) {
      const degreeDiff = calcDegreeDiffFromRadar(
        gameObj.deg,
        distanceObj.degree
      )
      const toumeido = calcOpacity(degreeDiff)

      gameObj.ctxRadar.fillStyle = `rgb(0, 220, 255, ${toumeido})`
      gameObj.ctxRadar.beginPath()
      gameObj.ctxRadar.arc(
        distanceObj.drawX,
        distanceObj.drawY,
        gameObj.airRadius,
        0,
        Math.PI * 2,
        true
      )
      gameObj.ctxRadar.fill()
    }
  }
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

  // プレイヤー情報をまとめたMap
  // console.log(gameObj.playersMap)
  // ミサイルアイテム情報をまとめたMap
  // console.log(gameObj.itemsMap)
  // 酸素アイテム情報をまとめたMap
  // console.log(gameObj.airMap)
})

/**
 * 角度をラジアンに変換する
 * @param {int} kakudo 角度
 */
function getRadian(kakudo) {
  // radian = 角度 * π / 180
  return (kakudo * Math.PI) / 180
}

/**
 * 2つの物の距離を計算
 * @param {int} pX
 * @param {int} pY
 * @param {int} oX
 * @param {int} oY
 * @param {int} gameWidth
 * @param {int} gameHeight
 * @param {int} radarCanvasWidth
 * @param {int} radarCanvasHeight
 */
function calculationBetweenTwoPoints(
  pX, // プレイヤーのx
  pY, // プレイヤーのy
  oX, // オブジェクトのx
  oY, // オブジェクトのy
  gameWidth, // ゲーム全体の横幅
  gameHeight, // ゲーム全体の縦幅
  radarCanvasWidth, // 表示可能エリアの横幅
  radarCanvasHeight // 表示可能エリアの縦幅
) {
  let distanceX = 99999999
  let distanceY = 99999999
  // 描画するx座標
  let drawX = null
  // 描画するy座標
  let drawY = null

  /**
   * マップは地球のように端と端がつながっているので
   * 左から と 右から の距離を計算し、より近い方を距離とする
   */

  /**
   * x座標のプレイヤーとオブジェクトの距離
   */
  if (pX <= oX) {
    // 右から
    distanceX = oX - pX
    drawX = radarCanvasWidth / 2 + distanceX
    let tmpDistance = oX + gameWidth - pX
    if (distanceX > tmpDistance) {
      // 近い方を距離とする
      distanceX = tmpDistance
      drawX = radarCanvasWidth / 2 - distanceX
    }
  } else {
    // 左から
    distanceX = pX - oX
    drawX = radarCanvasWidth / 2 - distanceX
    // 右から
    let tmpDistance = oX + gameWidth - pX
    if (distanceX > tmpDistance) {
      distanceX = tmpDistance
      drawX = radarCanvasWidth / 2 + distanceX
    }
  }

  /**
   * y座標のプレイヤーとオブジェクトの距離
   */
  if (pY <= oY) {
    // 下から
    distanceY = oY - pY
    drawY = radarCanvasHeight / 2 + distanceY
    // 上から
    let tmpDistance = pY + gameHeight - oY
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance
      drawY = radarCanvasHeight / 2 - distanceY
    }
  } else {
    // 上から
    distanceY = pY - oY
    drawY = radarCanvasHeight / 2 - distanceY
    // 下から
    let tmpDistance = oY + gameHeight - pY
    if (distanceY > tmpDistance) {
      distanceY = tmpDistance
      drawY = radarCanvasHeight / 2 + distanceY
    }
  }

  // プレイヤーとオブジェクトの角度を求める
  const degree = calcTwoPointsDegree(
    drawX,
    drawY,
    radarCanvasWidth / 2,
    radarCanvasHeight / 2
  )

  return {
    distanceX, // 距離（x座標）
    distanceY, // 距離（y座標）
    drawX, // 描画するx座標
    drawY, // 描画するy座標
    degree // プレイヤーとオブジェクトの角度
  }
}

/**
 * 2点間の角度を求める
 * @param {int} x1
 * @param {int} y1
 * @param {int} x2
 * @param {int} y2
 */
function calcTwoPointsDegree(x1, y1, x2, y2) {
  // アークタンジェントを用いてラジアン（弧度法での値）を求める
  const radian = Math.atan2(y2 - y1, x2 - x1)
  // ラジアンを角度に変換
  const degree = (radian * 180) / Math.PI + 180
  return degree
}

/**
 * アイテムとレーダーの角度の差を計算
 * ※ レーダーが通ったばかりのアイテムは距離が近く、徐々に反応を薄くさせる
 * @param {int} degRadar レーダーの角度
 * @param {int} degItem アイテムの角度
 */
function calcDegreeDiffFromRadar(degRadar, degItem) {
  let diff = degRadar - degItem
  if (diff < 0) {
    // レーダーより角度が大きい場合は１周分足す
    diff += 360
  }
  return diff
}

/**
 * レーダーとの距離からアイテムの透明度を計算
 * 1が完全に透明、0 ~ 1の間
 * @param {int} degreeDiff アイテムとレーダーの角度の差
 */
function calcOpacity(degreeDiff) {
  const deleteDeg = 270
  // 角度が270より大きい場合は270にして透明度を1にしてにして消す
  degreeDiff = degreeDiff > deleteDeg ? deleteDeg : degreeDiff
  return (1 - degreeDiff / deleteDeg).toFixed(2)
}

/**
 * 潜水艦を移動させる
 * @param {object} playersMap
 */
function movePlayers(playersMap) {
  for (let [playerId, player] of playersMap) {
    /**
     * プレイヤーごとに方向情報を取得し座標を移動する
     */

    if (player.isAlive === false) {
      // プレイヤーが生存していない場合はスキップ
      continue
    }

    switch (player.direction) {
      /**
       * 左上が（0, 0）
       */
      case 'left':
        player.x -= 1
        break
      case 'up':
        player.y -= 1
        break
      case 'right':
        player.x += 1
        break
      case 'down':
        player.y += 1
        break
    }

    if (player.x > gameObj.fieldWidth) {
      // ゲームエリアの右端に到達した場合は左端にx座標を移動
      player.x -= gameObj.fieldWidth
    }
    if (player.x < 0) {
      // ゲームエリアの左端に到達した場合は右端にx座標を移動
      player.x += gameObj.fieldWidth
    }
    if (player.y < 0) {
      // ゲームエリアの上端に到達した場合は下端にy座標を移動
      player.y += gameObj.fieldHeight
    }
    if (player.y > gameObj.fieldHeight) {
      // ゲームエリアの下端に到達した場合は上端にy座標を移動
      player.y -= gameObj.fieldHeight
    }
  }
}
