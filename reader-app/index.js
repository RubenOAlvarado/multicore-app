import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'

if(!process.argv[2]) throw new Error('Usage: node index.js <topic>');

const key = b4a.from(process.argv[2], 'hex');

const store = new Corestore('./data-reader')
await store.ready();

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

swarm.on('connection', (conn) => store.replicate(conn));

const core = store.get({key, valueEncoding: 'json'});
await core.ready();

const foundPeers = core.findingPeers();
swarm.join(core.discoveryKey);
swarm.flush().then(() => foundPeers());

await core.update();

if(core.length === 0){
    throw new Error('Could not connect to the writer peer.');
}

const { otherKeys } = await core.get(0);
for(const key of otherKeys){
    const core = store.get({key: b4a.from(key, 'hex')});
    core.on('append', () => {
        const seq = core.length - 1;
        core.get(seq).then(block => {
            console.log(`Block ${seq} in Core ${key}: ${block}`);
        });
    });
}