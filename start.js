const response = await fetch("https://matrix-client.matrix.org/_matrix/client/v3/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        type: "m.login.password",
        identifier: { type: "m.id.user", user: "pluralkitbot2" },
        password: "Edi29!de444"
    })
});
const data = await response.json();
console.log(data); // print everything