import {
    MatrixClient,
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
    RustSdkCryptoStorageProvider
} from "matrix-bot-sdk";
import {
    readFileSync, 
    writeFileSync,
    existsSync
} from "fs";

const homeserverUrl = "https://matrix-client.matrix.org";
const { access_token: accessToken } = JSON.parse(readFileSync("stuff.txt", "utf8"));
const storage = new SimpleFsStorageProvider("bot.json");
const crypto = new RustSdkCryptoStorageProvider("./crypto");
const MEMBERS_FILE = "members.json";

function loadMembers() {
    if (existsSync(MEMBERS_FILE)) {
        return JSON.parse(readFileSync(MEMBERS_FILE, "utf8"));
    }
    return [];
}

function saveMembers(members) {
    writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2));
}

let members = loadMembers();

const client = new MatrixClient(homeserverUrl, accessToken, storage, crypto);
AutojoinRoomsMixin.setupOnClient(client);

client.on("room.message", async (roomId, event) => {
    if (!event["content"]) return;

    const age = Date.now() - event["origin_server_ts"];
    if (age > 30000) return;

    const sender = event["sender"];
    if (sender === await client.getUserId()) return;

    const body = event["content"]["body"];
    if (!body) return;

    // !member add <name> <prefix>
    // example: !member add Alice A:
    if (body.startsWith("!member add ")) {
        const parts = body.substring("!member add ".length).trim().split(" ");
        if (parts.length < 2) {
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "Usage: !member add <name> <prefix>  (e.g. !member add Alice A:)",
            });
            return;
        }
        const [name, prefix] = parts;
        if (members.find(m => m.name === name)) {
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": `Member '${name}' already exists.`,
            });
            return;
        }
        members.push({ name, prefix });
        saveMembers(members);
        await client.sendMessage(roomId, {
            "msgtype": "m.notice",
            "body": `Added member '${name}' with prefix '${prefix}'.`,
        });
        return;
    }

    // !member remove <name>
    if (body.startsWith("!member remove ")) {
        const name = body.substring("!member remove ".length).trim();
        const before = members.length;
        members = members.filter(m => m.name !== name);
        if (members.length === before) {
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": `No member named '${name}' found.`,
            });
        } else {
            saveMembers(members);
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": `Removed member '${name}'.`,
            });
        }
        return;
    }

    // !member list
    if (body === "!member list") {
        if (members.length === 0) {
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": "No members registered yet.",
            });
        } else {
            const list = members.map(m => `${m.name} (prefix: '${m.prefix}')`).join("\n");
            await client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": `Registered members:\n${list}`,
            });
        }
        return;
    }

    // check for proxy tags
    for (const member of members) {
        if (body.startsWith(member.prefix)) {
            const text = body.substring(member.prefix.length).trim();
            try{
                await client.redactEvent(roomId, event["event_id"]);
            }
            catch (e) {
                await client.sendMessage(roomId, {
                    "msgtype": "m.text",
                    "body": `Error! The bot needs to be able to delete messages. Please allow the bot to delete messages to make this message dissapear`,
                });
            }
            await client.sendMessage(roomId, {
                "msgtype": "m.text",
                "body": `[${member.name}]: ${text}`,
            });
            return;
        }
    }
});

client.start().then(() => console.log("Client started!"));