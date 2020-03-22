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
