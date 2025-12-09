// This file is shared between Client and Server.
// It acts as the contract for all network communication.

export const MSG_FLUID = {
    PATCH: "fluid_patch",
    CONFIG: "fluid_config",
    TERRAIN: "fluid_terrain",
};

export const MSG_INPUT = {
    /**
     * Sent by Client.
     * Payload: { x: number, y: number }
     */
    CLICK: "input_click"
};
