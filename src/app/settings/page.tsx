"use client";

import type { Ecosystem, TrackKey } from "../lib/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
  Alert,
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

export default function SettingsPage() {
  const router = useRouter();

  const [budget, setBudget] = useState<number>(500000);
  const [ecosystem, setEcosystem] = useState<Ecosystem>("Apple HomeKit");

  const [hubs, setHubs] = useState<Record<string, boolean>>({
    "Google Home": true,
    "Яндекс Станция": false,
  });

  const [tracks, setTracks] = useState<Record<TrackKey, number>>({
    security: 8,
    light: 6,
    climate: 7,
    perimeter: 3,
  });

  const [fileName, setFileName] = useState<string>("");
  const [planDataUrl, setPlanDataUrl] = useState<string>("");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);

  const canStart = useMemo(() => {
    return budget > 0 && uploadState === "success" && planDataUrl.length > 0;
  }, [budget, uploadState, planDataUrl]);

  const startFakeUpload = (name: string) => {
    setFileName(name);
    setUploadState("uploading");
    setProgress(0);

    let p = 0;
    const t = setInterval(() => {
      p += 10;
      if (p >= 100) {
        clearInterval(t);
        setProgress(100);
        setUploadState("success");
      } else {
        setProgress(p);
      }
    }, 120);
  };

  return (
    <Box sx={{ minHeight: "100vh", p: 4 }}>
      <Card sx={{ maxWidth: 520, mx: "auto", borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Ввод настроек
          </Typography>

          <Stack spacing={2.2}>
            <TextField
              label="Бюджет (₽)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Выбор экосистемы</InputLabel>
              <Select
                value={ecosystem}
                label="Выбор экосистемы"
                onChange={(e) => setEcosystem(e.target.value as Ecosystem)}
              >
                <MenuItem value="Apple HomeKit">Apple HomeKit</MenuItem>
                <MenuItem value="Google Home">Google Home</MenuItem>
                <MenuItem value="Yandex Home">Yandex Home</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Дополнительные хабы</Typography>
              <Stack>
                {Object.keys(hubs).map((k) => (
                  <FormControlLabel
                    key={k}
                    control={
                      <Checkbox
                        checked={hubs[k]}
                        onChange={(e) => setHubs((prev) => ({ ...prev, [k]: e.target.checked }))}
                      />
                    }
                    label={k}
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Оценка значимости треков (0–10)</Typography>

              <TrackRow
                label="Безопасность"
                value={tracks.security}
                onChange={(v) => setTracks((p) => ({ ...p, security: v }))}
              />
              <TrackRow
                label="Контроль света"
                value={tracks.light}
                onChange={(v) => setTracks((p) => ({ ...p, light: v }))}
              />
              <TrackRow
                label="Климат-контроль"
                value={tracks.climate}
                onChange={(v) => setTracks((p) => ({ ...p, climate: v }))}
              />
              <TrackRow
                label="Охрана периметра"
                value={tracks.perimeter}
                onChange={(v) => setTracks((p) => ({ ...p, perimeter: v }))}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>План квартиры</Typography>

              <Button variant="outlined" component="label">
                Загрузить файл (PNG/PDF)
                <input
                  hidden
                  type="file"
                  accept=".png,.pdf,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;

                    setFileName(f.name);

                    // 10MB лимит
                    if (f.size > 10 * 1024 * 1024) {
                      setUploadState("error");
                      setProgress(0);
                      setPlanDataUrl("");
                      return;
                    }

                    setUploadState("uploading");
                    setProgress(30);

                    const isImage =
                      f.type === "image/png" ||
                      f.type === "image/jpeg" ||
                      f.type === "image/jpg";

                    if (!isImage) {
                      setUploadState("error");
                      setProgress(0);
                      setPlanDataUrl("");
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = String(reader.result);
                      setPlanDataUrl(dataUrl);

                      setProgress(100);
                      setUploadState("success");
                    };

                    reader.onerror = () => {
                      setUploadState("error");
                      setProgress(0);
                      setPlanDataUrl("");
                    };

                    reader.readAsDataURL(f);
                  }}
                />
              </Button>

              {uploadState === "uploading" && (
                <Box sx={{ mt: 1.2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography sx={{ mt: 0.5 }} variant="body2" color="text.secondary">
                    Загрузка: {progress}%
                  </Typography>
                </Box>
              )}

              {uploadState === "success" && (
                <Alert sx={{ mt: 1.2 }} severity="success">
                  Загружено успешно: {fileName}
                </Alert>
              )}

              {uploadState === "success" && planDataUrl && (
                <Box sx={{ mt: 1.5, borderRadius: 2, overflow: "hidden" }}>
                  <img
                    src={planDataUrl}
                    alt="preview"
                    style={{ width: "100%", display: "block" }}
                  />
                </Box>
              )}

              {uploadState === "error" && (
                <Alert sx={{ mt: 1.2 }} severity="error">
                  Ошибка загрузки: файл слишком большой (макс 10 МБ)
                </Alert>
              )}
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!canStart}
              onClick={() => {
                const data = { budget, ecosystem, hubs, tracks, fileName, planDataUrl };
                localStorage.setItem("settings", JSON.stringify(data));
                router.push("/plan");
              }}
            >
              Запустить подбор
            </Button>

            <Typography variant="body2" color="text.secondary">
              (Кнопка активируется после успешной загрузки плана)
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function TrackRow(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ mb: 1.2 }}>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {props.label}: {props.value}
      </Typography>
      <Slider
        value={props.value}
        min={0}
        max={10}
        step={1}
        onChange={(_, v) => props.onChange(v as number)}
      />
    </Box>
  );
}
