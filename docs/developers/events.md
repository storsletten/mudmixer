** This file is most likely out of date. Things may have been changed since it was written.

# Global MUDMixer events
You can listen for these events in exports.events.

## Event: loadingComplete
This event is emitted after everything has loaded but before start / restart action begins.

## Event: ready
This event is emitted after MUDMixer has finished starting / restarting.

## Event: deviceInbound [device, addressData]
This event is emitted when a client connects to a Listener instance and a new Device instance is created.
The Device instance is passed as the first argument.
The socket.address() data is passed as second argument. This object has keys such as address, port, and family.

## Event: deviceSet [device, options]
This event is emitted when a device is set. Typically this is immediately after socket and other options have been set.
The Device instance is passed as the first argument.

## Event: deviceClose [device, reason]
This event is emitted when a device is closed.
The Device instance is passed as the first argument.
The reason is either a string or undefined.

## Event: deviceUnset [device]
This event is emitted when a device is unset.
Typically this indicates that the device is being closed or its operations are transfered to a new Device instance after a restart.
The Device instance is passed as the first argument.

## Event: listenerReady [listener, addressData]
This event is emitted when a listener is ready and listening for incoming connections.
The Listener instance is passed as the first argument.
The socket.address() data is passed as second argument. This object has keys such as address, port, and family.

## Event: listenerSet [listener, options]
This event is emitted when a listener is set. The Listener instance is passed as the first argument.

## Event: listenerClose [listener, reason]
This event is emitted when a listener is closed. This means that any references to the listener should be deleted.
The Listener instance is passed as the first argument.
The reason is either a string or undefined.

## Event: listenerUnset [listener]
This event is emitted when a listener is unset.
Typically this indicates that the listener is being closed or its operations are transfered to a new Listener instance after a restart.
The Listener instance is passed as the first argument.
