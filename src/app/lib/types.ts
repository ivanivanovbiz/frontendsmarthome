export type Ecosystem = "Apple HomeKit" | "Google Home" | "Yandex Home";

export type TrackKey = "security" | "light" | "climate" | "perimeter";

export type SceneAction = "on" | "off" | "auto";

export type SceneDeviceState = {
    deviceId: string;  // id устройства (из devices)
    action: SceneAction; // что сделать
};

export type Scene = {
    id: string;
    name: string;
    ecosystem: Ecosystem;  // чтобы сцены были привязаны к экосистеме
    items: SceneDeviceState[];
    createdAt: number;
    runCount: number; // на будущее для “популярности”
};
