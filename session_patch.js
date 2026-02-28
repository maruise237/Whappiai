    static updateStatus(sessionId, status, detail = null, pairingCode = undefined) {
        let query = "UPDATE whatsapp_sessions SET status = ?, detail = ?, updated_at = datetime('now')";
        const params = [status, detail];

        if (pairingCode !== undefined) {
            query += ", pairing_code = ?";
            params.push(pairingCode);
        }

        query += " WHERE id = ?";
        params.push(sessionId);

        const stmt = db.prepare(query);
        stmt.run(...params);
        return this.findById(sessionId);
    }
