export function startKeepAlive() {
    const url = process.env.RENDER_EXTERNAL_URL;
    if (!url) return;

    const timer = setInterval(() => {
        fetch(`${url}/health`).catch((err) => {
            console.warn(JSON.stringify({ 
                level: 'warn', 
                message: 'Keep-alive ping failed', 
                reason: String(err) 
            }));
        });
    }, 10 * 60 * 1000);
  
}