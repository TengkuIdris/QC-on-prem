import { EventEmitter } from "events";

const event = new EventEmitter();
event.setMaxListeners(1000);
export default event;
