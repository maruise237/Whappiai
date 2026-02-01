const { Session } = require('./src/models');
async function check() {
    try {
        const s = await Session.findById('kamtech');
        console.log(JSON.stringify(s, null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
