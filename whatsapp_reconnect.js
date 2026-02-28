                    const timeout = setTimeout(async () => {
                        reconnectTimeouts.delete(sessionId);
                        // Check if it's still disconnected and no new connection was started
                        if (!activeSockets.has(sessionId) && !deletingSessions.has(sessionId)) {
                            try {
                                log(`Tentative de reconnexion ${retryCount}/100 pour ${sessionId}...`, sessionId, { event: 'reconnect-attempt' }, 'INFO');
                                await connect(sessionId, onUpdate, onMessage);
                            } catch (err) {
                                log(`Échec de la tentative de reconnexion ${retryCount}: ${err.message}`, sessionId, { event: 'reconnect-failed', attempt: retryCount, error: err.message }, 'ERROR');
                            }
                        }
                    }, delay);
                    reconnectTimeouts.set(sessionId, timeout);
