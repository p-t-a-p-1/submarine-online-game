'use strict'
// ハッシュ計算用モジュール
const crypto = require('crypto')

// ゲームで扱う値をオブジェクトとしてまとめる
const gameObj = {
  playersMap: new Map(),
  itemsMap: new Map(),
  airMap: new Map(),
  fieldWidth: 1000,
  fieldHeight: 1000,
  itemTotal: 15,
  airTotal: 10
}
