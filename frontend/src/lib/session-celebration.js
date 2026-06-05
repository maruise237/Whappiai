function isConnected(session) {
  return session?.status === "CONNECTED" || session?.isConnected === true
}

function shouldCelebrateSessionConnection(previousSession, update) {
  return Boolean(previousSession && !isConnected(previousSession) && isConnected(update))
}

module.exports = {
  shouldCelebrateSessionConnection,
}
