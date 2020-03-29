'use strict'
import $ from 'jquery'

// ゲームで使用するパラメータをオブジェクトにする
const gameObj = {
  raderCanvasWidth: 500,
  raderCanvasHeight: 500,
  scoreCanvasWidth: 300,
  scoreCanvasHeight: 500,
  deg: 0,
  myDisplayName: $('#main').attr('data-displayName'),
  myThumbUrl: $('#main').attr('data-thumbUrl')
}

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
  ctxRader.arc(0, 0, getRadian(0), getRadian(-30), true)
  // 円弧を描いた筆で中心に向かって線を描画
  ctxRader.lineTo(0, 0)

  // 描画したエリアを塗りつぶす
  ctxRader.fill()

  // 元の設定を取得
  ctxRader.restore()
  // 角度を5度足す
  gameObj.deg = (gameObj.deg + 5) % 360
}
