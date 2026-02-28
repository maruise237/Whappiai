const broadcastSessionUpdate = (id, status, detail, qrOrCode) => {
    const isPairingCode = status === 'GENERATING_CODE';
    const isQR = status === 'GENERATING_QR';

    const codeValue = isPairingCode ? qrOrCode : (status === 'CONNECTED' ? null : undefined);
    const qrValue = isQR ? qrOrCode : (status === 'CONNECTED' ? null : undefined);

    Session.updateStatus(id, status, detail, codeValue);

    broadcastToClients({
        type: 'session-update',
        data: [{
            sessionId: id,
            status,
            detail,
            isConnected: status === 'CONNECTED',
            qr: qrValue,
            pairingCode: codeValue,
            token: Session.findById(id)?.token
        }]
    });
};
