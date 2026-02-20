import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("number") x = Math.floor(Math.random() * 400);
    @type("number") y = Math.floor(Math.random() * 400);
}

export class Mote extends Schema {
    @type("number") x = 0;
    @type("number") y = 0;
    @type("number") dX = 0;
    @type("number") dY = 0;

    drift(dT:number){
        this.x += this.dX*dT/10;;
        this.y += this.dY*dT/10;
    }
}

export class State extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type( [ Mote ] ) motes = new ArraySchema<Mote>();
    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string) {
        this.players.set(sessionId, new Player());
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, movement: any) {
        if (movement.x) {
            this.players.get(sessionId).x += movement.x * 10;
        }
        if (movement.y) {
            this.players.get(sessionId).y += movement.y * 10;
        }
    }
    shoot (sessionId: string, direction: any) {
        let mote = new Mote();
        mote.x = this.players.get(sessionId).x;
        mote.y = this.players.get(sessionId).y;
        mote.dX = direction.x || 0;
        mote.dY = direction.y || 0;
        if (mote.dX == 0 && mote.dY == 0){
            mote.dX = 1;
        }

        this.motes.push(mote);
    }
}

export class SquaresRoom extends Room {
    maxClients = 4;
    state = new State();

    onCreate (options : any) {
        console.log("SquaresRoom created!", options);
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        this.onMessage("move", (client: Client, data) => {
            console.log("SquaresRoom received move message from", client.sessionId, ":", data);
            this.state.movePlayer(client.sessionId, data);
        });
        this.onMessage("fire", (client: Client, data) => {
            console.log("SquaresRoom received fire message from", client.sessionId, ":", data);
            this.state.shoot(client.sessionId, data);
        });
    }

    // onAuth(client, options, req) {
    //     return true;
    // }

    onJoin (client: Client) {
        // client.send("hello", "world");
        console.log(client.sessionId, "joined!");
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client: Client, code?: number) {
        console.log(client.sessionId, "left!");
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose SquaresRoom");
    }

    update(dT: number){
        let i = this.state.motes.length-1;
        while (i>=0){
            let mote = this.state.motes[i]; 
            if (mote.x < 0 || mote.x > 1000 || mote.y < 0 || mote.y > 1000) {
                this.state.motes.splice(i, 1);
            }
            else {
                mote.drift(dT);
            }
            i--;
        } 
    }

}
