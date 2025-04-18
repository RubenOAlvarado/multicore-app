import Hyperswarm from "hyperswarm";
import Corestore from "corestore";
import b4a from "b4a";

const store = new Corestore("./data-writer");
const swarm = new Hyperswarm();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown(){
    console.log('shutting down...');
    try {
        await swarm.destroy();
        await store.close();
        console.log('Shutdown complete.');
        process.exit(1);
    } catch (error) {
        console.error(`Error during shutdown: ${error}`);
        process.exit(0);
    }
}

const core1 = store.get({ name: "core-1", valueEncoding: "json"  });
const core2 = store.get({ name: "core-2" });
const core3 = store.get({ name: "core-3" });

await Promise.all([core1.ready(), core2.ready(), core3.ready()]);

console.log('main core key: ', b4a.toString(core1.key, 'hex'));

swarm.join(core1.discoveryKey);

swarm.on('connection', (conn) => store.replicate(conn));

if(core1.length === 0){
    await core1.append({
        otherKeys: [core2, core3].map(core => b4a.toString(core.key, 'hex')),
    });
}

process.stdin.on('data', (data) => {
    console.log('data received: ', data.length);
    if (data.length < 5){
        console.log('appending short data to core2');
        core2.append(data);
    }else{
        console.log('appending long data to core3');
        core3.append(data);
    }
});