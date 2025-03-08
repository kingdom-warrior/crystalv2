const { Vec3 } = require('vec3');
const ITEMS_TO_REFILL = {
    'enchanted_golden_apple': { name: 'enchanted_golden_apple', shulkerPos: new Vec3() },
    'end_crystal': { name: 'end_crystal', shulkerPos: new Vec3() },
    'chest': { name: 'chest', shulkerPos: new Vec3() },
    'experience_bottle': { name: 'experience_bottle', shulkerPos: new Vec3() }
};
const ARMOR_SLOTS = [5, 6, 7, 8]; // Helmet, Chestplate, Leggings, Boots
const DURABILITY_THRESHOLD = 0.7; // 70%
const chestPos = new Vec3();
const crystalPos = new Vec3();
module.exports.dupe = async function (bot) {
    const mcData = require('minecraft-data')(bot.version);
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    await delay(10000);

    while (true) {
        await delay(1000); // Wait for 1 seconds before starting
        for (const key in ITEMS_TO_REFILL) {
            const itemData = ITEMS_TO_REFILL[key];
            const itemCount = bot.inventory.count(mcData.itemsByName[itemData.name].id);

            if (itemCount <= 2) {
                console.log(`Low on ${itemData.name}, refilling...`);
                await openShulkerAndGrab(itemData, itemCount, bot);
            }
        }
        await eatGoldenApple(bot);
        await checkArmorAndUseXP(bot);
        // Place a chest at the target position
        try {
            const chestItem = bot.inventory.findInventoryItem(mcData.itemsByName.chest.id);
            if (chestItem) {
                await bot.equip(chestItem, 'hand');
                await bot.placeBlock(bot.blockAt(chestPos.offset(0, -1, 0)), new Vec3(0, 1, 0));
                console.log('Chest placed!');
                await delay(300);
            } else {
                console.log("No chest in inventory.");
                return;
            }
        } catch (err) {
            console.log(`Error placing chest: ${err.message}`);
            return;
        }
        bot.setControlState('forward', true);
        await delay(300);
        bot.setControlState('forward', false);
        // Open the chest and deposit all items
        try {
            let container = await bot.openContainer(bot.blockAt(chestPos));
            console.log("Chest opened. Depositing all items...");

            let items = bot.inventory.items().filter(item => item.name.includes("shulker_box"));
            for (let i = 0; i < items.length; i++) {
                try {
                    await container.deposit(items[i].type, null, items[i].count);
                    console.log(`Deposited ${items[i].name} x${items[i].count}`);
                    if ((i + 1) % 6 === 0) {
                        await delay(400); // Prevents packet spam
                    }
                } catch (depositError) {
                    if (depositError.message.includes("full") || depositError.message.includes("no space")) {
                        console.log("Chest is full. Continuing execution...");
                        break;
                    } else {
                        throw depositError;
                    }
                }
            }

            await container.close();
            console.log("Finished depositing items.");
        } catch (err) {
            console.log(`Error opening chest: ${err.message}`);
            return;
        }
        // Place End Crystal on Bedrock/Obsidian
        try {
            const baseBlock = bot.blockAt(crystalPos);
            if (!baseBlock || (baseBlock.name !== 'obsidian' && baseBlock.name !== 'bedrock')) {
                console.log("End Crystal can only be placed on Obsidian or Bedrock!");
                return;
            }

            const endCrystal = bot.inventory.findInventoryItem(mcData.itemsByName.end_crystal.id);
            if (endCrystal) {
                await bot.equip(endCrystal, 'hand');
                await bot.placeEntity(baseBlock, new Vec3(0, 1, 0));
                console.log("End Crystal placed!");
                await delay(300);
            } else {
                console.log("No End Crystal in inventory.");
                return;
            }
        } catch (err) {
            console.log(`Error placing End Crystal: ${err.message}`);
        }
        // Equip netherite axe before mining
        try {
            const axeItem = bot.inventory.findInventoryItem(mcData.itemsByName.netherite_axe.id);
            if (axeItem) {
                await bot.equip(axeItem, 'hand');
                console.log("Netherite axe equipped.");
            } else {
                console.log("No netherite axe in inventory.");
            }
        } catch (err) {
            console.log(`Error equipping axe: ${err.message}`);
        }

        // Look at the End Crystal before mining the chest
        try {
            await bot.lookAt(crystalPos.offset(0, 1, 0));
            console.log("Looking at End Crystal.");
            await delay(300);
        } catch (err) {
            console.log(`Error looking at End Crystal: ${err.message}`);
        }

        // Mine the chest
        if (bot.blockAt(chestPos)) {
            try {
                bot._client.write('block_dig', {
                    status: 0,
                    location: chestPos,
                    face: 1
                });

                await delay(166); // Wait for chest to be nearly mined

                bot._client.write('block_dig', {
                    status: 2,
                    location: chestPos,
                    face: 1
                });
                await delay(4); // Fine-tune to reach exactly 170 ms

                // Left-click the End Crystal at the right moment
                try {
                    let crystalEntity = bot.nearestEntity(entity => entity.name === 'end_crystal');
                    if (crystalEntity) {
                        await bot.swingArm('right');
                        await bot.attack(crystalEntity);
                        console.log("Left-clicked the End Crystal!");
                    } else {
                        console.log("No End Crystal found nearby.");
                    }
                } catch (err) {
                    console.log(`Error left-clicking End Crystal: ${err.message}`);
                }
                console.log('Chest mined!');
            } catch (err) {
                console.log(`Error mining chest: ${err.message}`);
            }
        } else {
            console.log("No block found at the given coordinates.");
        }

    }
};
async function openShulkerAndGrab(itemData, currentCount, bot) {
    try {
        // Check if inventory is full before opening the shulker
        console.log(bot.inventory.items().length);
        if (bot.inventory.items().length >= 36) {

            console.log("Inventory is full, dropping shulker boxes...");
            
            let items = bot.inventory.items().filter(item => item.name.includes("shulker_box"));
            let droppedCount = 0;
            
            for (const dropItem of items) {

                await bot.lookAt(bot.entity.position.offset(1, 0, 0)); // Look east
                let dropAmount = Math.min(5, dropItem.count); // Drop up to 5
                await bot.toss(dropItem.id, null, dropAmount);
                console.log(`Dropped ${dropAmount} of ${dropItem.name}.`);
                droppedCount++;
                if (droppedCount >= 10) break; // Stop after dropping 5 items
            }
        }

        const block = bot.blockAt(itemData.shulkerPos);

        if (!block) {
            console.log(`Shulker box not found at ${itemData.shulkerPos}`);
            return;
        }

        const shulker = await bot.openContainer(block);

        if (!shulker) {
            console.log("Failed to open shulker.");
            return;
        }

        const item = shulker.containerItems().find(i => i.name === itemData.name);

        if (!item) {
            console.log(`No ${itemData.name} found in the shulker.`);
            shulker.close();
            return;
        }

        // Find a slot where the bot already has this item
        const botItemSlot = bot.inventory.items().find(i => i.name === itemData.name);

        // If the bot has this item in its inventory, calculate how much can fit in that slot
        let maxStackSize = bot.registry.items[item.type]?.stackSize || 64;
        let availableSpace = botItemSlot ? maxStackSize - botItemSlot.count : maxStackSize;
        
        // If the bot can store more of the item in the same slot
        let amountToTransfer = Math.min(availableSpace, item.count);
        
            await shulker.withdraw(item.type, null, amountToTransfer);
            console.log(`Refilled ${itemData.name} by ${amountToTransfer} items.`);
        await shulker.close();

    } catch (error) {
        console.error(`Error opening shulker and grabbing items: ${error.message}`);
    }
}

async function eatGoldenApple(bot) {
    console.log(Math.floor(bot.health));
    if (Math.floor(bot.health) < 10) {
        const gapple = bot.inventory.items().find(item => item.name.includes('golden_apple'));

        if (gapple) {
            try {
                await bot.equip(gapple, 'hand'); // Equip the golden apple
                console.log('Eating enchanted golden apple!');
                await bot.consume(); // Eat the golden apple
                console.log('Golden apple consumed!');
            } catch (err) {
                console.log('Failed to eat golden apple:', err);
            }
        } else {
            console.log('No enchanted golden apple found!');
        }
    }
}
async function checkArmorAndUseXP(bot) {
    const armor = bot.inventory.slots.filter((item, index) => ARMOR_SLOTS.includes(index) && item);

    for (const piece of armor) {
        const durability = (piece.maxDurability - piece.durabilityUsed) / piece.maxDurability;
        if (durability < DURABILITY_THRESHOLD) {
            console.log('XPXPXPXPXP');
            await useXPBottles(bot); // Ensure XP bottles are fully used before proceeding
        }
    }

    console.log("Armor check complete. Proceeding with further execution.");
}

async function useXPBottles(bot) {
    const xpBottle = bot.inventory.items().find(item => item.name.includes('experience_bottle'));
    if (!xpBottle) return console.log("I'm out of XP bottles!");

    try {
        await bot.equip(xpBottle, 'hand');
        await bot.look(0, 90, false);

        for (let i = 0; i < 62; i++) {
            bot.activateItem(); // Start using XP bottle
            await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for throwing
            bot.deactivateItem(); // Stop using XP bottle
        }

        console.log("Used exactly 62 XP bottles!");

    } catch (err) {
        console.log("Error using XP bottles:", err);
    }
}