const mineflayer = require('mineflayer');
const dupeModule = require('./dupe');

let bot;
let isRestarting = false;

function initializeBot() {
    bot = mineflayer.createBot({
        host: '6b6t.org',
        auth: 'microsoft', // Use Microsoft authentication
        username: 'your_mail@gmail.com',
        version: '1.20.1',
    });

    bot.on('login', () => {
        console.log(`Logged in as ${bot.username}`);
        setupMessageHandlers(bot);
        dupeModule.dupe(getBot());
    });

    bot.on('end', () => {
        console.log('Disconnected.');
        if (isRestarting) {
            console.log('Waiting 10 minutes before reconnecting due to server restart...');
            setTimeout(() => {
                isRestarting = false;
                initializeBot();
            }, 7 * 60 * 1000);
        } else {
            console.log('Reconnecting in 5 seconds...');
            setTimeout(initializeBot, 5000);
        }
    });

    bot.on('kicked', (reason) => {
        console.log(`Kicked: ${reason}`);
    });

    bot.on('error', (err) => {
        console.log(`Error: ${err}`);
    });

    return bot;
}

bot = initializeBot();

function setupMessageHandlers(bot) {
    bot.on('message', async (jsonMsg) => {
        const message = jsonMsg.toString();
        const restartMessages = [
            'Server restarts in 60s',
            'Server restarts in 30s',
            'Server restarts in 15s',
            'Server restarts in 10s',
            'Server restarts in 5s',
            'Server restarts in 4s',
            'Server restarts in 3s',
            'Server restarts in 2s',
            'Server restarts in 1s',
            'The target server is offline now! You have been sent to the backup server while it goes back online.',
            'You were kicked from main-server: Server closed',
            'The main server is restarting. We will be back soon! Join our Discord with /discord command in the meantime.'
        ];

        if (restartMessages.includes(message)) {
            console.log('Server restart detected. Disconnecting bot...');
            isRestarting = true;
            bot.end();
        }

    });
}

function getBot() {
    return bot;
}

module.exports = { getBot };
