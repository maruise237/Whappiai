    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        qrTimeout: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: (jid) => isJidBroadcast(jid),
        markOnlineOnConnect: true,
        linkPreviewImageThumbnailWidth: 192,
        getMessage: async (key) => {
            return { conversation: 'hello' };
        },
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                return {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
    });

    activeSockets.set(sessionId, sock);

    if (phoneNumber && !state.creds.registered) {
        const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, '');
        log(`Demande de code d'appairage pour ${sanitizedPhoneNumber}`, sessionId, { event: 'pairing-code-request', phoneNumber: sanitizedPhoneNumber }, 'INFO');
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(sanitizedPhoneNumber);
                log(`Code d'appairage reçu: ${code}`, sessionId, { event: 'pairing-code-received', code }, 'INFO');
                if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Pairing code generated', code);
            } catch (err) {
                log(`Erreur lors de la demande du code d'appairage: ${err.message}`, sessionId, { event: 'pairing-code-error', error: err.message }, 'ERROR');
                if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Pairing error: ${err.message}`, null);
            }
        }, 5000);
    }
