const { db } = require('./src/config/database');
const { getAdminGroups } = require('./src/services/moderation');
const { log } = require('./src/utils/logger');

// We need to mock a bailey's socket
const mockSock = {
    user: {
        id: '1234567890:1@s.whatsapp.net',
        name: 'Test User'
    },
    ws: { readyState: 1 },
    groupFetchAllParticipating: async () => {
        const groups = {};
        for (let i = 0; i < 5000; i++) {
            groups[`group${i}@g.us`] = {
                id: `group${i}@g.us`,
                subject: `Group ${i}`,
                participants: [
                    { id: '1234567890@s.whatsapp.net', admin: 'admin' },
                    { id: 'another@s.whatsapp.net' }
                ]
            };
        }
        return groups;
    },
    groupMetadata: async (id) => {
        return {
            id,
            subject: `Group ${id}`,
            participants: [
                { id: '1234567890@s.whatsapp.net', admin: 'admin' }
            ]
        };
    }
};

// Override log to suppress it for benchmark
const originalLog = log;
require('./src/utils/logger').log = () => {};

async function runBenchmark() {
    console.log("Setting up DB...");

    // Turn off foreign key constraints temporarily to allow arbitrary session_id
    db.exec("PRAGMA foreign_keys = OFF");

    // Let's create dummy settings for these groups
    const stmt = db.prepare(`
        INSERT INTO group_settings (group_id, session_id, is_active, anti_link, bad_words, warning_template, max_warnings)
        VALUES (?, ?, 1, 1, 'bad,words', 'Warning', 5)
        ON CONFLICT(group_id, session_id) DO NOTHING
    `);

    db.exec("BEGIN TRANSACTION");
    for (let i = 0; i < 5000; i++) {
        stmt.run(`group${i}@g.us`, 'test_session');
    }
    db.exec("COMMIT");
    console.log("DB Setup complete.");

    console.log("Running getAdminGroups...");
    const start = performance.now();
    const groups = await getAdminGroups(mockSock, 'test_session');
    const end = performance.now();

    console.log(`Found ${groups.length} admin groups.`);
    console.log(`Time taken: ${(end - start).toFixed(2)} ms`);
}

runBenchmark().catch(console.error);
