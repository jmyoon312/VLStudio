module.exports = {
    apps: [{
        name: "n8n-local",
        script: "./packages/cli/bin/n8n",
        args: "start",
        cwd: "c:/build/new/ViraLoop/n8n-v2",
        env: {
            N8N_PORT: 5678,
            N8N_PROTOCOL: "http",
            NODE_ENV: "production",
            WEBHOOK_URL: "http://localhost:5678/"
        }
    }]
}
