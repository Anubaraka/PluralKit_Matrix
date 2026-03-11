import { config } from "dotenv"

config();

try {
    const response = await fetch("https://matrix-client.matrix.org/_matrix/client/v3/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "m.login.password",
            identifier: { type: "m.id.user", user: process.env.MATRIX_USER },
            password: process.env.MATRIX_PASSWORD
        })
    });

    const data = await response.json();
    console.log("Got response:", data);
    console.log("Done writing stuff.txt");
} catch (e) {
    console.error("Error:", e);
}