                    const timeout = setTimeout(async () => {
                        reconnectTimeouts.delete(sessionId);
                        if (!activeSockets.has(sessionId) && !deletingSessions.has(sessionId)) {
                            try {
                                log(`Tentative de reconnexion pour ${sessionId}...`, sessionId, { event: 'reconnect-attempt', attempt: retryCount }, 'INFO');
                                await connect(sessionId, onUpdate, onMessage);
                            } catch (err) {
                                log(`Échec de la reconnexion ${retryCount}: ${err.message}`, sessionId, { event: 'reconnect-failed', attempt: retryCount, error: err.message }, 'ERROR');
                            }
                        }
                    }, delay);
                    reconnectTimeouts.set(sessionId, timeout);
                } else {
                    log(`Nombre maximum de tentatives de reconnexion atteint`, sessionId, { event: 'reconnect-max-reached' }, 'WARN');
                    retryCounters.delete(sessionId);
                    if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Max reconnection attempts reached', null);
                }
