"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Ecosystem, TrackKey } from "../lib/types";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

type Device = {
  id: string;
  name: string;
  type: string;
  ecosystem: Ecosystem;
  x: number;
  y: number;
  price: number;
  impacts: Partial<Record<TrackKey, number>>;
};

type Settings = {
  planDataUrl?: string;
  budget: number;
  ecosystem: Ecosystem;
  hubs: Record<string, boolean>;
  tracks: Record<TrackKey, number>;
  fileName?: string;
};

type MarketplaceOffer = {
  name: "Яндекс Маркет" | "Ozon" | "Wildberries";
  price: number;
  url?: string;
};

type AnalogItem = {
  name: string;
  price: number;
  img: string;
  url?: string;
};

type DeviceCardInfo = {
  title: string;         // Xiaomi Mijia
  description: string;   // текст под названием
  img: string;           // /devices/lock.png
  offers: MarketplaceOffer[];
  analogs: AnalogItem[];
};

const defaultDevices: Device[] = [
  {
    id: "lock",
    name: "Умный замок",
    type: "Smart Lock",
    ecosystem: "Apple HomeKit",
    x: 62,
    y: 47,
    price: 10600,
    impacts: { security: 9 },
  },
  {
    id: "light",
    name: "Свет в гостиной",
    type: "Light",
    ecosystem: "Yandex Home",
    x: 78,
    y: 68,
    price: 2500,
    impacts: { light: 8 },
  },
  {
    id: "climate",
    name: "Климат-контроль",
    type: "Thermostat",
    ecosystem: "Google Home",
    x: 35,
    y: 35,
    price: 8900,
    impacts: { climate: 9 },
  },
  {
    id: "perimeter",
    name: "Датчик открытия двери/окна",
    type: "Contact Sensor",
    ecosystem: "Yandex Home",
    x: 20,
    y: 60,
    price: 1700,
    impacts: { perimeter: 7, security: 3 },
  },
];


export default function PlanPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>(() => {
    if (typeof window === "undefined") return defaultDevices;

    try {
      const raw = localStorage.getItem("devices");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) return saved as Device[];
      }
    } catch { }

    return defaultDevices;
  });


  useEffect(() => {
    localStorage.setItem("devices", JSON.stringify(devices));
  }, [devices]);


  useEffect(() => {
    localStorage.setItem("devices", JSON.stringify(devices));
  }, [devices]);


  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedId, setSelectedId] = useState<string>("lock");
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [newDeviceId, setNewDeviceId] = useState("lock");
  const [newDeviceName, setNewDeviceName] = useState("Новое устройство");
  const [newDeviceEco, setNewDeviceEco] = useState<Ecosystem>("Apple HomeKit");
  const [newDevicePrice, setNewDevicePrice] = useState(3000);

  const planRef = useRef<HTMLDivElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("settings");
    if (!raw) {
      router.push("/settings");
      return;
    }
    try {
      setSettings(JSON.parse(raw));
    } catch {
      router.push("/settings");
    }
  }, [router]);

  useEffect(() => {
    const rawDevices = localStorage.getItem("devices");
    if (rawDevices) {
      try {
        const saved = JSON.parse(rawDevices) as Device[];
        if (Array.isArray(saved) && saved.length > 0) {
          setDevices(saved);
          return;
        }
      } catch { }
    }

    const rawPos = localStorage.getItem("devicePositions");
    if (!rawPos) return;

    try {
      const pos = JSON.parse(rawPos) as Record<string, { x: number; y: number }>;
      setDevices((prev) =>
        prev.map((d) => (pos[d.id] ? { ...d, x: pos[d.id].x, y: pos[d.id].y } : d))
      );
    } catch { }
  }, []);

  const scored = useMemo(() => {
    if (!settings) return [];

    const filtered = devices.filter((d) => d.ecosystem === settings.ecosystem);

    const scoreOf = (d: Device) => {
      let s = 0;
      for (const k of Object.keys(settings.tracks) as TrackKey[]) {
        const w = settings.tracks[k] ?? 0;
        const impact = d.impacts[k] ?? 0;
        s += w * impact;
      }
      return s;
    };

    return filtered
      .map((d) => ({
        device: d,
        score: scoreOf(d),
        valuePerRub: scoreOf(d) / Math.max(1, d.price),
      }))
      .sort((a, b) => b.valuePerRub - a.valuePerRub);
  }, [devices, settings]);

  const recommended = useMemo(() => {
    if (!settings) return [];
    let sum = 0;
    const picked: typeof scored = [];

    for (const item of scored) {
      if (sum + item.device.price <= settings.budget) {
        picked.push(item);
        sum += item.device.price;
      }
    }
    return picked;
  }, [scored, settings]);

  const recommendedIds = useMemo(() => {
    return new Set(recommended.map((x) => x.device.id));
  }, [recommended]);

  const visibleDevices = useMemo(() => {
    if (!settings) return devices;
    const ecosystemFiltered = devices.filter((d) => d.ecosystem === settings.ecosystem);
    if (!onlyRecommended) return ecosystemFiltered;
    return ecosystemFiltered.filter((d) => recommendedIds.has(d.id));
  }, [devices, onlyRecommended, recommendedIds, settings]);

  const selected = visibleDevices.find((d) => d.id === selectedId) ?? visibleDevices[0];

  const total = useMemo(() => {
    return recommended.reduce((acc, x) => acc + x.device.price, 0);
  }, [recommended]);

  const left = settings ? settings.budget - total : 0;

  const savePositions = (next: Device[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const d of next) pos[d.id] = { x: d.x, y: d.y };
    localStorage.setItem("devicePositions", JSON.stringify(pos));
  };

  const openUrl = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const impactsByKind = (kind: string): Partial<Record<TrackKey, number>> => {
    switch (kind) {
      case "lock":
        return { security: 9 };
      case "light":
        return { light: 8 };
      case "climate":
        return { climate: 9 };
      case "perimeter":
        return { perimeter: 7, security: 3 };
      default:
        return {};
    }
  };


  const addDevice = () => {
    const uniqueId = `${newDeviceId}-${Date.now()}`;

    const nextDevice: Device = {
      id: uniqueId,
      name: newDeviceName.trim() || "Новое устройство",
      type: newDeviceId,
      ecosystem: newDeviceEco,
      x: 50,
      y: 50,
      price: Number(newDevicePrice) || 0,
      impacts: impactsByKind(newDeviceId),
    };

    setDevices((prev) => {
      const next = [...prev, nextDevice];
      savePositions(next);
      return next;
    });

    setSelectedId(uniqueId);
    setAddOpen(false);
  };



  const cardInfoById: Record<string, DeviceCardInfo> = {
    lock: {
      title: "Xiaomi Mijia",
      description:
        "Способы разблокировки: отпечаток пальца, пароль, временный пароль, Bluetooth, приложение, аварийный ключ.",
      img: "/devices/lock.png",
      offers: [
        { name: "Яндекс Маркет", price: 19950, url: "https://market.yandex.ru/" },
        { name: "Ozon", price: 20450, url: "https://www.ozon.ru/" },
        { name: "Wildberries", price: 21300, url: "https://www.wildberries.ru/" },
      ],
      analogs: [
        {
          name: "Aqara Door lock N100",
          price: 18990,
          img: "/devices/lock.png",
          url: "https://market.yandex.ru/",
        },
        {
          name: "Samsung Smart Lock",
          price: 25990,
          img: "/devices/lock.png",
          url: "https://www.ozon.ru/",
        },
      ],
    },

    light: {
      title: "Умный свет",
      description: "Лампы и выключатели с управлением через приложение и голос.",
      img: "/devices/light.png",
      offers: [
        { name: "Яндекс Маркет", price: 2490, url: "https://market.yandex.ru/" },
        { name: "Ozon", price: 2690, url: "https://www.ozon.ru/" },
        { name: "Wildberries", price: 2390, url: "https://www.wildberries.ru/" },
      ],
      analogs: [
        {
          name: "Yeelight Bulb",
          price: 2190,
          img: "/devices/light.png",
          url: "https://market.yandex.ru/",
        },
        {
          name: "Philips Hue",
          price: 3990,
          img: "/devices/light.png",
          url: "https://www.ozon.ru/",
        },
      ],
    },

    climate: {
      title: "Thermostat Pro",
      description: "Поддерживает авто-режим, расписания и управление удалённо.",
      img: "/devices/thermostat.png",
      offers: [
        { name: "Яндекс Маркет", price: 8990, url: "https://market.yandex.ru/" },
        { name: "Ozon", price: 9200, url: "https://www.ozon.ru/" },
        { name: "Wildberries", price: 8700, url: "https://www.wildberries.ru/" },
      ],

      analogs: [
        {
          name: "Nest Thermostat",
          price: 12990,
          img: "/devices/thermostat.png",
          url: "https://market.yandex.ru/",
        },
        {
          name: "Tado Smart",
          price: 11990,
          img: "/devices/thermostat.png",
          url: "https://www.ozon.ru/",
        },
      ],
    },

    perimeter: {
      title: "Door/Window Sensor",
      description:
        "Срабатывает при открытии, отправляет уведомления, работает от батарейки.",
      img: "/devices/sensor.png",
      offers: [
        { name: "Яндекс Маркет", price: 1690, url: "https://market.yandex.ru/" },
        { name: "Ozon", price: 1750, url: "https://www.ozon.ru/" },
        { name: "Wildberries", price: 1590, url: "https://www.wildberries.ru/" },
      ],
      analogs: [
        {
          name: "Aqara Sensor",
          price: 1990,
          img: "/devices/sensor.png",
          url: "https://market.yandex.ru/",
        },
        {
          name: "Sonoff Sensor",
          price: 990,
          img: "/devices/sensor.png",
          url: "https://www.ozon.ru/",
        },
      ],
    },
  };

  const selectedInfo = selected
    ? cardInfoById[selected.id] ??
    cardInfoById[String(selected.id).split("-")[0]]
    : null;

  const bestOffer = useMemo(() => {
    if (!selectedInfo?.offers?.length) return null;
    return selectedInfo.offers.reduce(
      (min, o) => (o.price < min.price ? o : min),
      selectedInfo.offers[0]
    );
  }, [selectedInfo]);


  return (
    <Box sx={{ minHeight: "100vh", p: 4 }}>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff" }}>
            План квартиры и устройства
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => setAddOpen(true)}
              sx={{ fontWeight: 800 }}
            >
              + Добавить устройство
            </Button>

            <Button
              variant="contained"
              onClick={() => router.push("/analytics")}
              sx={{
                fontWeight: 800,

                background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                color: "#fff",

                boxShadow: "0 4px 12px rgba(99,102,241,0.35)",

                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5, #2563eb)",
                  boxShadow: "0 6px 16px rgba(99,102,241,0.45)",
                },
              }}
            >
              Аналитика
            </Button>

            <Button
              variant="contained"
              onClick={() => router.push("/scenes")}
              sx={{
                fontWeight: 800,
                background: "linear-gradient(135deg, #10b981, #22c55e)",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #059669, #16a34a)",
                  boxShadow: "0 6px 16px rgba(16,185,129,0.45)",
                },
              }}
            >
              Сценарии
            </Button>


            <Button
              variant="contained"
              onClick={() => {
                localStorage.removeItem("devices");
                localStorage.removeItem("devicePositions");
                router.push("/settings");
              }}
              sx={{
                background: "#fff",
                color: "#1f2937",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                "&:hover": {
                  background: "#f9fafb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                },
              }}
            >
              Назад к вводу настроек
            </Button>

          </Stack>
        </Stack>

        {/* Итоги */}
        <Card sx={{ borderRadius: 4, mb: 2 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1}
            >
              <Stack spacing={0.3}>
                <Typography sx={{ fontWeight: 700 }}>Итого по подбору</Typography>
                <Typography color="text.secondary">
                  Экосистема: <b>{settings?.ecosystem ?? "—"}</b>
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography>
                  Бюджет: <b>{(settings?.budget ?? 0).toLocaleString("ru-RU")} ₽</b>
                </Typography>
                <Typography>
                  Набор: <b>{total.toLocaleString("ru-RU")} ₽</b>
                </Typography>
                <Typography color={left < 0 ? "error.main" : "text.primary"}>
                  Остаток: <b>{left.toLocaleString("ru-RU")} ₽</b>
                </Typography>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={onlyRecommended}
                    onChange={(e) => setOnlyRecommended(e.target.checked)}
                  />
                }
                label="Только рекомендованные"
              />
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip label="Apple HomeKit" />
              <Chip label="Google Home" />
              <Chip label="Yandex Home" />
            </Stack>
          </CardContent>
        </Card>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {/* План */}
          <Card sx={{ flex: 1, borderRadius: 4 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>План (кликни на устройство)</Typography>

              <Box
                ref={planRef}
                onPointerMove={(e) => {
                  if (!dragId) return;
                  const el = planRef.current;
                  if (!el) return;

                  const r = el.getBoundingClientRect();
                  const px = ((e.clientX - r.left) / r.width) * 100;
                  const py = ((e.clientY - r.top) / r.height) * 100;

                  const x = Math.max(0, Math.min(100, px));
                  const y = Math.max(0, Math.min(100, py));

                  setDevices((prev) => {
                    const next = prev.map((d) => (d.id === dragId ? { ...d, x, y } : d));
                    savePositions(next);
                    return next;
                  });
                }}
                onPointerUp={() => setDragId(null)}
                onPointerLeave={() => setDragId(null)}
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 10",
                  borderRadius: 3,
                  overflow: "hidden",
                  background: "#e9edf3",
                  touchAction: "none",
                }}
              >

                <Image
                  src={settings?.planDataUrl || "/floorplan.png"}
                  alt="Floor plan"
                  fill
                  style={{ objectFit: "cover" }}
                  priority
                  unoptimized
                />
                {visibleDevices.map((d) => {
                  const isRec = recommendedIds.has(d.id);
                  const isSelected = d.id === (selected?.id ?? "");

                  return (
                    <Box
                      key={d.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedId(d.id);
                        setDragId(d.id);
                      }}
                      onClick={() => setSelectedId(d.id)}
                      sx={{
                        position: "absolute",
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: isRec ? 22 : 18,
                        height: isRec ? 22 : 18,
                        borderRadius: "999px",
                        cursor: "grab",
                        border: isRec ? "3px solid white" : "2px solid white",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                        background:
                          d.ecosystem === "Apple HomeKit"
                            ? "#F5B400"
                            : d.ecosystem === "Google Home"
                              ? "#4CAF50"
                              : "#3F8CFF",
                        outline: isSelected ? "3px solid rgba(63,140,255,0.35)" : "none",
                        opacity: onlyRecommended && !isRec ? 0.25 : 1,
                        userSelect: "none",
                      }}
                      title={isRec ? `${d.name} (рекомендуется)` : d.name}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Карточка */}
          <Card sx={{ width: { xs: "100%", md: 420 }, borderRadius: 4 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Карточка устройства</Typography>
              <Divider sx={{ mb: 2 }} />

              {!selected || !selectedInfo ? (
                <Typography color="text.secondary">Выбери устройство на плане</Typography>
              ) : (
                <Stack spacing={2}>
                  {/* Верх: фото + текст */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 90,
                        height: 90,
                        borderRadius: 3,
                        overflow: "hidden",
                        background: "#f0f2f6",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={selectedInfo.img}
                        alt={selectedInfo.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </Box>

                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                        {selected.name}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.2 }}>{selectedInfo.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                        {selectedInfo.description}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Маркетплейсы */}
                  <Stack spacing={1.2}>
                    {selectedInfo.offers.map((o) => (
                      <Stack
                        key={o.name}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        onClick={() => openUrl(o.url)}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          background: "#f7f8fb",
                          border: "1px solid rgba(0,0,0,0.06)",
                          cursor: o.url ? "pointer" : "default",
                          "&:hover": o.url ? { background: "#eef2ff" } : undefined,
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {o.name === "Яндекс Маркет" ? "Я" : o.name === "Ozon" ? "O" : "W"}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700 }}>{o.name}</Typography>
                        </Stack>

                        <Typography sx={{ fontWeight: 800 }}>{o.price.toLocaleString("ru-RU")} ₽</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  {/* Аналоги */}
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.08)",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: 800 }}>Варианты аналогов</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.4}>
                        {selectedInfo.analogs.map((a) => (
                          <Stack
                            key={a.name}
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                              p: 1,
                              borderRadius: 2,
                              background: "#fff",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <Stack direction="row" spacing={1.3} alignItems="center">
                              <Box
                                sx={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 2,
                                  overflow: "hidden",
                                  background: "#f0f2f6",
                                  flexShrink: 0,
                                }}
                              >
                                <img
                                  src={a.img}
                                  alt={a.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                              </Box>

                              <Box>
                                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{a.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {a.price.toLocaleString("ru-RU")} ₽
                                </Typography>
                              </Box>
                            </Stack>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => openUrl(a.url)}
                              disabled={!a.url}
                            >
                              Перейти
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  {/* Кнопки */}
                  <Stack direction="row" spacing={1.2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => openUrl(bestOffer?.url)}
                      disabled={!bestOffer?.url}
                      sx={{ fontWeight: 800 }}
                    >
                      Открыть маркетплейс
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => alert("Здесь будет подбор аналогов")}
                      sx={{ fontWeight: 800 }}
                    >
                      Аналоги
                    </Button>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Добавить устройство</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select
                value={newDeviceId}
                label="Тип"
                onChange={(e) => setNewDeviceId(String(e.target.value))}
              >
                <MenuItem value="lock">Замок</MenuItem>
                <MenuItem value="light">Свет</MenuItem>
                <MenuItem value="climate">Климат</MenuItem>
                <MenuItem value="perimeter">Датчик</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Название"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Экосистема</InputLabel>
              <Select
                value={newDeviceEco}
                label="Экосистема"
                onChange={(e) => setNewDeviceEco(e.target.value as Ecosystem)}
              >
                <MenuItem value="Apple HomeKit">Apple HomeKit</MenuItem>
                <MenuItem value="Google Home">Google Home</MenuItem>
                <MenuItem value="Yandex Home">Yandex Home</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Цена (₽)"
              type="number"
              value={newDevicePrice}
              onChange={(e) => setNewDevicePrice(Number(e.target.value))}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={() => setAddOpen(false)}>
            Отмена
          </Button>

          <Button variant="contained" onClick={addDevice} sx={{ fontWeight: 800 }}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

