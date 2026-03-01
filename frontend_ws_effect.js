  // Real-time WebSocket updates
  React.useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'session-update') {
      const updates = Array.isArray(lastMessage.data) ? lastMessage.data : [lastMessage.data];
      setSessions(prev => prev.map(session => {
        const update = updates.find((u: any) => u.sessionId === session.sessionId);
        if (update) {
          // Robust update: preserve existing fields, override with new ones
          const updatedSession = { ...session, ...update };

          // Specifically handle pairing code and QR clearing/preservation
          if (update.pairingCode === null) updatedSession.pairingCode = null;
          if (update.qr === null) updatedSession.qr = null;

          return updatedSession;
        }
        return session;
      }));
    }

    if (lastMessage.type === 'session-deleted') {
      const deletedId = lastMessage.data?.sessionId;
      if (deletedId) {
        setSessions(prev => prev.filter(s => s.sessionId !== deletedId));
        if (selectedSessionId === deletedId) setSelectedSessionId(null);
      }
    }
  }, [lastMessage, selectedSessionId]);
