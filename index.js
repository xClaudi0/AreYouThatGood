const Discord = require("discord.js");
const axios = require("axios");
const stringSimilarity = require("string-similarity");
const { Client, Intents } = Discord;
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.MESSAGE_CONTENT],
});

require("dotenv").config();


const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const RIOT_API_KEY = process.env.RIOT_API_KEY
const PLAYER_NAME = process.env.PLAYER_NAME
const PLAYER_REGION = process.env.PLAYER_REGION
const DISCORD_CHANNEL_NAME = process.env.DISCORD_CHANNEL_NAME


async function getPlayerRank() {
    try {
        const response = await axios.get(
            `https://${PLAYER_REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${PLAYER_NAME}?api_key=${RIOT_API_KEY}`
        );

        const { id } = response.data;

        const rankedResponse = await axios.get(
            `https://${PLAYER_REGION}.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${RIOT_API_KEY}`
        );

        const rankedData = rankedResponse.data.find(
            (entry) => entry.queueType === "RANKED_SOLO_5x5"
        );

        return rankedData;
    } catch (error) {
        console.error("Error fetching player rank:", error);
    }
}

function createMockingMessage(playerName, rank, tier) {
    console.log("Sending mocking message to", playerName, rank, tier)
    return `Dai ${playerName}, sei ancora bloccato a ${tier} ${rank}? Forse dovresti giocare di più! O magari cambiare gioco...😂`;
}
function removeEmojis(str) {
    return str.replace(/<a?:.*:\d*>/g, '').trim();
}
function findSimilarChannel(channels, targetName) {
    const cleanedTargetName = removeEmojis(targetName);
    let bestMatch = null;
    let maxSimilarity = 0;

    channels.forEach((channel) => {
        const cleanedChannelName = removeEmojis(channel.name);
        const similarity = stringSimilarity.compareTwoStrings(cleanedChannelName, cleanedTargetName);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = channel;
        }
    });

    return bestMatch;
}

async function main() {
    client.once("ready", async () => {
        console.log("Bot is ready!");

        setInterval(async () => {
            const rankedData = await getPlayerRank();
            if (rankedData && rankedData.tier !== "GOLD") {
                const guild = client.guilds.cache.first();
                if (guild) {
                    const userDefinedChannelName = DISCORD_CHANNEL_NAME
                    const channel = findSimilarChannel(guild.channels.cache, userDefinedChannelName);
                    console.log("Message will be delivered to channel", channel)

                    if (channel) {
                        const mockingMessage = createMockingMessage(PLAYER_NAME, rankedData.rank, rankedData.tier);
                        channel.send(mockingMessage);
                    }
                }
            }
        }, 30 * 60 * 1000);
    });

    client.on("messageCreate", async (message) => {
        if (message.content === "!checkrank") {
            const rankedData = await getPlayerRank();
            if (rankedData && rankedData.tier !== "GOLD") {
                const mockingMessage = createMockingMessage(PLAYER_NAME, rankedData.rank, rankedData.tier);
                message.channel.send(mockingMessage);
            }
        }
    });

    await client.login(DISCORD_BOT_TOKEN);
}

main();
