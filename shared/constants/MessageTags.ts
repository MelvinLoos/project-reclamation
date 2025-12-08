// This file is shared between Client and Server.
// It acts as the contract for all network communication.

export const MSG_FLUID = {
    /** * Sent by Server (approx 10Hz).
     * Payload: Uint8Array (RLE Compressed or Raw Quantized Fluid Data).
     */
    PATCH: "fluidPatch",

    /**
     * Sent by Server on Join.
     * Payload: { width: number, height: number }
     */
    CONFIG: "fluidConfig"
};

export const MSG_INPUT = {
    /**
     * Sent by Client.
     * Payload: { x: number, y: number }
     */
    CLICK: "input_click"
};