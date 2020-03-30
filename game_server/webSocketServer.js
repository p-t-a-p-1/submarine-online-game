/**
 *
 */

/**
 * WebSocketの待ち受けを開始する関数
 * @param {*} io
 * @param {*} game
 */
function createWebSocketServer(io, game) {
  /**
   * WebSocketのNamespacesを使って通信を部屋（グループ）分け
   * 今回は1つの部屋（グループ）しか使わないので必要ないが今後ユーザーを部屋分けしたい時にここを設定する
   */
  const rootIo = io.of('/')

  // 新しくWebSocketの通信ができた際に実行される
  rootIo.on('connection', socket => {
    /**
     * 新しく接続されたユーザーのTwitterのアカウント名とサムネ画像
     */
    const displayName = socket.handshake.query.displayName
    const thumbUrl = socket.handshake.query.thumbUrl

    // ログ出力
    console.log('WebSocket のコネクションがありました')

    /**
     * 接続できたユーザーにデータを送信する
     * start-dataという名前のデータを送っているが、送信するデータはまだ空オブジェクト
     */
    socket.emit('start data', {})

    // ユーザーが接続を切断した際に実行される（特に実装しない）
    socket.on('disconnect', () => {})
  })

  // 66ミリ秒ごとに'map-data'という名前のデータを送信する（ゲームのマップ情報）
  const socketTicker = setInterval(() => {
    /**
     * 全員に送信
     * volatileはクライアントにデータが届いたかを確認しない送信方法（高頻度な通信で便利）
     */
    rootIo.volatile.emit('map data', {})
  }, 66)
}

// 別のJavaScriptファイルから扱えるように
module.exports = {
  createWebSocketServer
}
