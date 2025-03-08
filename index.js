const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const  minecraftData = require('minecraft-data');
const { Vec3 } = require('vec3');
require('dotenv').config();
const dupeModule = require('./dupe');
const mcPassword = process.env.MC_PASSWORD;
let bot;
let isRestarting = false;
function initializeBot() {
    bot = mineflayer.createBot({
        host: '6b6t.org',
        username: 'your_minecraft_username',
        version: '1.20.1',
    });

    bot.on('login', () => {
        console.log(`Logged in as ${bot.username}`);
        setupMessageHandlers(bot);
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

        if (message === `${bot.username}, please login with the command: /login <password>`) {
            performLoginAndMoveForward();
        }
        if (message === 'Server restarts in 60s' ||
            message === 'Server restarts in 30s' ||
            message === 'Server restarts in 15s' ||
            message === 'Server restarts in 10s' ||
            message === 'Server restarts in 5s' ||
            message === 'Server restarts in 4s' ||
            message === 'Server restarts in 3s' ||
            message === 'Server restarts in 2s' ||
            message === 'Server restarts in 1s' ||
            message === 'The target server is offline now! You have been sent to the backup server while it goes back online.' ||
            message === 'You were kicked from main-server: Server closed' ||
            message === 'The main server is restarting. We will be back soon! Join our Discord with /discord command in the meantime.') {
            console.log('Server restart detected. Disconnecting bot...');
            isRestarting = true;
            bot.end();
        }
    });
}
function performLoginAndMoveForward() {
    console.log('Sending login command...');
    bot.chat(`/login ${mcPassword}`);
    bot.loadPlugin(pathfinder);
    
    setTimeout(() => {
        navigateToPortal(bot);
    }, 5000); 
}

function getBot() {
    return bot;
}
async function navigateToPortal(bot) {
    console.log(`Bot position: ${bot.entity.position}`);
    
    // Ensure pathfinder is loaded
    if (!bot.pathfinder) {
        console.log('Pathfinder not loaded!');
        return;
    }

    const mcData = minecraftData(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    // Define the movement goal
    const destination = new Vec3(-1001, 101, -988);

    bot.pathfinder.setGoal(new goals.GoalBlock(destination.x, destination.y, destination.z));

    // Listen for goal completion event
    bot.once('goal_reached', (goal) => {
        if (goal.x === destination.x && goal.y === destination.y && goal.z === destination.z) {
            console.log(`[${bot.username}] Reached ${destination}, executing dupe module.`);
            dupeModule.dupe(getBot());
        }
    });
}


module.exports = { getBot };
