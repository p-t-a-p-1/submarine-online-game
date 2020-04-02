'use strict'
// ハッシュ計算用モジュール
const crypto = require('crypto')

/**
 * ゲームで扱う値をオブジェクトとしてまとめる
 */
const gameObj = {
  playersMap: new Map(), // ゲームに参加しているプレイヤー情報の連想配列
  itemsMap: new Map(), // ミサイルのアイテム情報の連想配列
  airMap: new Map(), // 酸素のアイテム情報の連想配列
  fieldWidth: 1000, // ゲームの横幅
  fieldHeight: 1000, // ゲームの縦幅
  itemTotal: 15, // ゲームに出現するミサイルのアイテムの数
  airTotal: 10 // ゲームに出現する酸素のアイテムの数
}

/**
 * ゲームの初期設定
 */
function init() {
  for (let i = 0; i < gameObj.itemTotal; i++) {
    // ミサイルのアイテムの数だけ追加
    addItem()
  }
  for (let a = 0; i < gameObj.airTotal; a++) {
    // 酸素のアイテムの数だけ追加
    addAir()
  }
}
init()

/**
 * 新しくプレイヤーがゲームに参加し、WebSocket接続した際の処理
 * @param {int} socketId
 * @param {string} displayName
 * @param {string} thumbUrl
 */
function newConnection(socketId, displayName, thumbUrl) {
  // スタート時のX座標をランダムで設定
  const playerX = Math.floor(Math.random() * gameObj.fieldWidth)
  // スタート時のY座標をランダムで設定
  const playerY = Math.floor(Math.random() * gameObj.fieldWidth)
  // プレイヤーのIDをsocketIDからハッシュ値を計算して定義
  const playerId = crypto
    .createHash('sha1')
    .update(socketId)
    .digest('hex')

  // プレイヤー情報のオブジェクト定義
  const playerObj = {
    x: playerX,
    y: playerY,
    playerId: playerId,
    displayName: displayName,
    thumbUrl: thumbUrl,
    isAlive: true, // 生存フラグ
    direction: 'right', // 潜水艦の初期の進行方向
    score: 0 // プレイヤーのスコア（初期は0）
  }
  // ゲーム設定オブジェクトのプレイヤー情報の連想配列にセット
  gameObj.playersMap.set(socketId, playerObj)

  // ゲームの設定値をオブジェクトを入れて返す
  const startObj = {
    playerObj: playerObj,
    fieldWidth: fieldWidth,
    fieldHeight: fieldHeight
  }
  return startObj
}

/**
 * ゲームのマップ情報を作成
 * オブジェクトだと大きいデータになるので、値だけを入れて配列として返す
 */
function getMapData() {
  const playersArray = []
  const itemsArray = []
  const airArray = []

  for (let [socketId, player] of gameObj.playersMap) {
    // プレイヤー情報の数だけループ
    const playerDataForSend = []

    /**
     * プレイヤー情報の値をセット
     */
    playerDataForSend.push(player.x)
    playerDataForSend.push(player.y)
    playerDataForSend.push(player.playerId)
    playerDataForSend.push(player.displayName)
    playerDataForSend.push(player.isAlive)
    playerDataForSend.push(player.direction)
    playerDataForSend.push(player.score)

    // 上記のデータをまとめてplayersArrayに追加
    playersArray.push(playerDataForSend)
  }

  for (let [id, item] of gameObj.itemsMap) {
    // ミサイルのアイテムの数だけループ
    const itemDataForSend = []

    /**
     * ミサイルのアイテムの値をセット
     */
    itemDataForSend.push(item.x)
    itemDataForSend.push(item.y)

    itemsArray.push(itemDataForSend)
  }

  for (let [id, air] of gameObj.airMap) {
    // 酸素のアイテムの数だけループ
    const airDataForSend = []

    /**
     * 酸素のアイテムの値をセット
     */
    airDataForSend.push(air.x)
    airDataForSend.push(air.y)

    airArray.push(airDataForSend)
  }

  return [playersArray, itemsArray, airArray]
}

/**
 * プレイヤーの接続が切れた際はプレイヤー情報のMapから削除
 * @param {int} socketId プレイヤーのsocketのid
 */
function disconnect(socketId) {
  gameObj.playersMap.delete(socketId)
}

/**
 * ミサイルのアイテムをMapに追加
 */
function addItem() {
  // ミサイルのアイテムの初期座標を乱数で設定
  const itemX = Math.floor(Math.random() * gameObj.fieldWidth)
  const itemY = Math.floor(Math.random() * gameObj.fieldWidth)
  // itemsMapのKey用
  const itemKey = `${itemX},${itemY}`

  if (gameObj.itemsMap.has(itemKey)) {
    // アイテムの位置（座標）が被った場合はもう一回生成
    return addItem()
  }

  // ミサイルアイテムの座標情報のオブジェクト生成
  const itemObj = {
    x: itemX,
    y: itemY
  }

  // gameObjのitemsMapに追加
  gameObj.itemsMap.set(itemKey, itemObj)
}

/**
 * 酸素のアイテムをMapに追加
 */
function addAir() {
  // 酸素のアイテムの初期座標を乱数で設定
  const airX = Math.floor(Math.random() * gameObj.fieldWidth)
  const airY = Math.floor(Math.random() * gameObj.fieldWidth)
  // airMapのKey用
  const airKey = `${airX},${airY}`

  if (gameObj.airMap.has(airKey)) {
    // アイテムの位置（座標）が被ったらもう一度生成
    return addAir()
  }

  // 酸素アイテムの座標情報のオブジェクト生成
  const airObj = {
    x: airX,
    y: airY
  }

  // gameObjのairMapに追加
  gameObj.airMap.set(airKey, airObj)
}

// 上記関数をwebSocketServer.jsでも使えるようにモジュールとして登録
module.exports = {
  newConnection,
  getMapData,
  disconnect
}
